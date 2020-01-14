<template>
  <div class="echarts" ref="chart"></div>
</template>

<script>
import echarts from "echarts/lib/echarts";
import debounce from "lodash/debounce";
import isPlainObject from "lodash/isPlainObject";
import { addListener, removeListener } from "resize-detector";

import shineTheme from "../theme/shine";
import {
  formatKMBT,
  getTitle,
  getTooltip,
  getLegend,
  getToolbox,
  getXAxisTicks,
  getYAxisTicks,
  getSeries
} from "../util/util";
echarts.registerTheme("shine", shineTheme);

// 暴露给外部的方法
const EVENTS = [
  "legendselectchanged",
  "legendselected",
  "legendunselected",
  "legendscroll",
  "datazoom",
  "datarangeselected",
  "timelinechanged",
  "timelineplaychanged",
  "restore",
  "dataviewchanged",
  "magictypechanged",
  "geoselectchanged",
  "geoselected",
  "geounselected",
  "pieselectchanged",
  "pieselected",
  "pieunselected",
  "mapselectchanged",
  "mapselected",
  "mapunselected",
  "axisareaselected",
  "focusnodeadjacency",
  "unfocusnodeadjacency",
  "brush",
  "brushselected",
  "rendered",
  "finished",
  "click",
  "dblclick",
  "mouseover",
  "mouseout",
  "mousemove",
  "mousedown",
  "mouseup",
  "globalout",
  "contextmenu"
];

export default {
  name: "NoxEcharts",

  props: {
    config: Object,
    data: Array,
    initOptions: Object, // 附加参数，init chart时使用
    theme: {
      type: [String, Object],
      default: "shine"
    },
    autoresize: {
      type: Boolean,
      default: true
    },
    manualUpdate: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      lastArea: 0
    };
  },

  computed: {
    options() {
      const config = this.config;
      // 暂时支持以下选项，如果需要增加修改下面代码
      const options = {
        title: getTitle(this.data, config),
        tooltip: getTooltip(this.data, config),
        legend: getLegend(this.data, config),
        toolbox: getToolbox(this.data, config),
        xAxis: getXAxisTicks(this.data, config),
        yAxis: getYAxisTicks(this.data, config),
        series: getSeries(this.data, config)
      };
      return options;
    }
  },

  created() {
    this.initOptionsWatcher();
  },

  mounted() {
    // auto init if `options` is already provided
    if (this.options) {
      this.init();
    }
  },

  destroyed() {
    if (this.chart) {
      this.destroy();
    }
  },

  methods: {
    // 设置图表容器的width， height
    setSize() {
      const ndEl = this.$el;
      if (!ndEl) {
        return;
      }
      const ndParent = ndEl.parentElement;
      const parentWidth = ndParent.clientWidth;
      const parentHeight = ndParent.clientHeight;

      const width = this.config.width || parentWidth || 320;
      const height = this.config.height || parentHeight || 240;

      ndEl.style.width = width + "px";
      ndEl.style.height = height + "px";
    },

    // provide a explicit merge option method
    mergeOptions(options, notMerge, lazyUpdate) {
      if (this.manualUpdate) {
        this.manualOptions = options;
      }

      if (!this.chart) {
        this.init();
      } else {
        this.chart.clear();
        this.chart.setOption(options, notMerge, lazyUpdate);
      }
    },

    getArea() {
      return this.$el.offsetWidth * this.$el.offsetHeight;
    },

    init() {
      if (this.chart) {
        return;
      }

      // 计算容器尺寸
      this.setSize();
      const chart = echarts.init(this.$el, this.theme, this.initOptions);
      chart.setOption(this.manualOptions || this.options || {}, true);

      // 曝光echarts的events，使得外部可以捕获
      EVENTS.forEach(event => {
        chart.on(event, params => {
          this.$emit(event, params);
        });
      });

      if (this.autoresize) {
        this.lastArea = this.getArea();
        this.__resizeHandler = debounce(
          () => {
            if (this.lastArea === 0) {
              // 初始echarts隐藏的情况
              this.mergeOptions({}, true);
              this.chart.resize();
              this.mergeOptions(this.options || this.manualOptions || {}, true);
            } else {
              this.setSize();
              this.chart.resize();
            }
            this.lastArea = this.getArea();
          },
          100,
          { leading: true }
        );
        addListener(this.$el.parentElement, this.__resizeHandler);
      }

      this.chart = chart;
    },

    initOptionsWatcher() {
      if (this.__unwatchOptions) {
        this.__unwatchOptions();
        this.__unwatchOptions = null;
      }

      if (!this.manualUpdate) {
        this.__unwatchOptions = this.$watch(
          "options",
          (val, oldVal) => {
            if (!this.chart && val) {
              this.init();
            } else {
              this.chart.clear();
              this.chart.setOption(val);
            }
          },
          { deep: true }
        );
      }
    },

    destroy() {
      if (this.autoresize) {
        removeListener(this.$el.parentElement, this.__resizeHandler);
      }
      this.chart.dispose();
      this.chart = null;
    },

    refresh() {
      if (this.chart) {
        this.destroy();
        this.init();
      }
    }
  }
};
</script>
