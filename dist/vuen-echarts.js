(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('echarts/lib/echarts'), require('lodash/debounce'), require('lodash/isPlainObject')) :
  typeof define === 'function' && define.amd ? define(['echarts/lib/echarts', 'lodash/debounce', 'lodash/isPlainObject'], factory) :
  (global = global || self, global.VueNECharts = factory(global.echarts, global.debounce, global.isPlainObject));
}(this, (function (echarts, debounce, isPlainObject) { 'use strict';

  echarts = echarts && echarts.hasOwnProperty('default') ? echarts['default'] : echarts;
  debounce = debounce && debounce.hasOwnProperty('default') ? debounce['default'] : debounce;
  isPlainObject = isPlainObject && isPlainObject.hasOwnProperty('default') ? isPlainObject['default'] : isPlainObject;

  let raf = null;

  function requestAnimationFrame(callback) {
    if (!raf) {
      raf = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        return setTimeout(callback, 16);
      }).bind(window);
    }

    return raf(callback);
  }

  let caf = null;

  function cancelAnimationFrame(id) {
    if (!caf) {
      caf = (window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function (id) {
        clearTimeout(id);
      }).bind(window);
    }

    caf(id);
  }

  function createStyles(styleText) {
    var style = document.createElement('style');
    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = styleText;
    } else {
      style.appendChild(document.createTextNode(styleText));
    }

    (document.querySelector('head') || document.body).appendChild(style);
    return style;
  }

  function createElement(tagName, props = {}) {
    let elem = document.createElement(tagName);
    Object.keys(props).forEach(key => {
      elem[key] = props[key];
    });
    return elem;
  }

  function getComputedStyle(elem, prop, pseudo) {
    // for older versions of Firefox, `getComputedStyle` required
    // the second argument and may return `null` for some elements
    // when `display: none`
    let computedStyle = window.getComputedStyle(elem, pseudo || null) || {
      display: 'none'
    };
    return computedStyle[prop];
  }

  function getRenderInfo(elem) {
    if (!document.documentElement.contains(elem)) {
      return {
        detached: true,
        rendered: false
      };
    }

    let current = elem;

    while (current !== document) {
      if (getComputedStyle(current, 'display') === 'none') {
        return {
          detached: false,
          rendered: false
        };
      }

      current = current.parentNode;
    }

    return {
      detached: false,
      rendered: true
    };
  }

  var css = ".resize-triggers{visibility:hidden;opacity:0}.resize-contract-trigger,.resize-contract-trigger:before,.resize-expand-trigger,.resize-triggers{content:\"\";position:absolute;top:0;left:0;height:100%;width:100%;overflow:hidden}.resize-contract-trigger,.resize-expand-trigger{background:#eee;overflow:auto}.resize-contract-trigger:before{width:200%;height:200%}";
  let total = 0;
  let style = null;

  function addListener(elem, callback) {
    if (!elem.__resize_mutation_handler__) {
      elem.__resize_mutation_handler__ = handleMutation.bind(elem);
    }

    let listeners = elem.__resize_listeners__;

    if (!listeners) {
      elem.__resize_listeners__ = [];

      if (window.ResizeObserver) {
        let {
          offsetWidth,
          offsetHeight
        } = elem;
        let ro = new ResizeObserver(() => {
          if (!elem.__resize_observer_triggered__) {
            elem.__resize_observer_triggered__ = true;

            if (elem.offsetWidth === offsetWidth && elem.offsetHeight === offsetHeight) {
              return;
            }
          }

          runCallbacks(elem);
        }); // initially display none won't trigger ResizeObserver callback

        let {
          detached,
          rendered
        } = getRenderInfo(elem);
        elem.__resize_observer_triggered__ = detached === false && rendered === false;
        elem.__resize_observer__ = ro;
        ro.observe(elem);
      } else if (elem.attachEvent && elem.addEventListener) {
        // targeting IE9/10
        elem.__resize_legacy_resize_handler__ = function handleLegacyResize() {
          runCallbacks(elem);
        };

        elem.attachEvent('onresize', elem.__resize_legacy_resize_handler__);
        document.addEventListener('DOMSubtreeModified', elem.__resize_mutation_handler__);
      } else {
        if (!total) {
          style = createStyles(css);
        }

        initTriggers(elem);
        elem.__resize_rendered__ = getRenderInfo(elem).rendered;

        if (window.MutationObserver) {
          let mo = new MutationObserver(elem.__resize_mutation_handler__);
          mo.observe(document, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true
          });
          elem.__resize_mutation_observer__ = mo;
        }
      }
    }

    elem.__resize_listeners__.push(callback);

    total++;
  }

  function removeListener(elem, callback) {
    let listeners = elem.__resize_listeners__;

    if (!listeners) {
      return;
    }

    if (callback) {
      listeners.splice(listeners.indexOf(callback), 1);
    } // no listeners exist, or removing all listeners


    if (!listeners.length || !callback) {
      // targeting IE9/10
      if (elem.detachEvent && elem.removeEventListener) {
        elem.detachEvent('onresize', elem.__resize_legacy_resize_handler__);
        document.removeEventListener('DOMSubtreeModified', elem.__resize_mutation_handler__);
        return;
      }

      if (elem.__resize_observer__) {
        elem.__resize_observer__.unobserve(elem);

        elem.__resize_observer__.disconnect();

        elem.__resize_observer__ = null;
      } else {
        if (elem.__resize_mutation_observer__) {
          elem.__resize_mutation_observer__.disconnect();

          elem.__resize_mutation_observer__ = null;
        }

        elem.removeEventListener('scroll', handleScroll);
        elem.removeChild(elem.__resize_triggers__.triggers);
        elem.__resize_triggers__ = null;
      }

      elem.__resize_listeners__ = null;
    }

    if (! --total && style) {
      style.parentNode.removeChild(style);
    }
  }

  function getUpdatedSize(elem) {
    let {
      width,
      height
    } = elem.__resize_last__;
    let {
      offsetWidth,
      offsetHeight
    } = elem;

    if (offsetWidth !== width || offsetHeight !== height) {
      return {
        width: offsetWidth,
        height: offsetHeight
      };
    }

    return null;
  }

  function handleMutation() {
    // `this` denotes the scrolling element
    let {
      rendered,
      detached
    } = getRenderInfo(this);

    if (rendered !== this.__resize_rendered__) {
      if (!detached && this.__resize_triggers__) {
        resetTriggers(this);
        this.addEventListener('scroll', handleScroll, true);
      }

      this.__resize_rendered__ = rendered;
      runCallbacks(this);
    }
  }

  function handleScroll() {
    // `this` denotes the scrolling element
    resetTriggers(this);

    if (this.__resize_raf__) {
      cancelAnimationFrame(this.__resize_raf__);
    }

    this.__resize_raf__ = requestAnimationFrame(() => {
      let updated = getUpdatedSize(this);

      if (updated) {
        this.__resize_last__ = updated;
        runCallbacks(this);
      }
    });
  }

  function runCallbacks(elem) {
    if (!elem || !elem.__resize_listeners__) {
      return;
    }

    elem.__resize_listeners__.forEach(callback => {
      callback.call(elem);
    });
  }

  function initTriggers(elem) {
    let position = getComputedStyle(elem, 'position');

    if (!position || position === 'static') {
      elem.style.position = 'relative';
    }

    elem.__resize_old_position__ = position;
    elem.__resize_last__ = {};
    let triggers = createElement('div', {
      className: 'resize-triggers'
    });
    let expand = createElement('div', {
      className: 'resize-expand-trigger'
    });
    let expandChild = createElement('div');
    let contract = createElement('div', {
      className: 'resize-contract-trigger'
    });
    expand.appendChild(expandChild);
    triggers.appendChild(expand);
    triggers.appendChild(contract);
    elem.appendChild(triggers);
    elem.__resize_triggers__ = {
      triggers,
      expand,
      expandChild,
      contract
    };
    resetTriggers(elem);
    elem.addEventListener('scroll', handleScroll, true);
    elem.__resize_last__ = {
      width: elem.offsetWidth,
      height: elem.offsetHeight
    };
  }

  function resetTriggers(elem) {
    let {
      expand,
      expandChild,
      contract
    } = elem.__resize_triggers__; // batch read

    let {
      scrollWidth: csw,
      scrollHeight: csh
    } = contract;
    let {
      offsetWidth: eow,
      offsetHeight: eoh,
      scrollWidth: esw,
      scrollHeight: esh
    } = expand; // batch write

    contract.scrollLeft = csw;
    contract.scrollTop = csh;
    expandChild.style.width = eow + 1 + 'px';
    expandChild.style.height = eoh + 1 + 'px';
    expand.scrollLeft = esw;
    expand.scrollTop = esh;
  }

  const colorPalette = ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa', '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050', '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'];
  var shineTheme = {
    color: colorPalette,
    title: {
      textStyle: {
        fontWeight: 'normal',
        color: '#008acd'
      }
    },
    visualMap: {
      itemWidth: 15,
      color: ['#5ab1ef', '#e0ffff']
    },
    legend: {
      textStyle: {
        color: '#666'
      }
    },
    toolbox: {
      iconStyle: {
        normal: {
          borderColor: colorPalette[0]
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(50,50,50,0.5)',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#ccc'
        },
        crossStyle: {
          color: '#008acd'
        },
        shadowStyle: {
          color: 'rgba(200,200,200,0.2)'
        }
      }
    },
    dataZoom: {
      dataBackgroundColor: '#efefff',
      fillerColor: 'rgba(182,162,222,0.2)',
      handleColor: '#008acd'
    },
    grid: {
      borderColor: '#eee'
    },
    categoryAxis: {
      axisLine: {
        lineStyle: {
          color: '#ccc',
          weight: 2
        }
      },
      axisLabel: {
        color: '#666'
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: ['#eee']
        }
      }
    },
    valueAxis: {
      axisLine: {
        lineStyle: {
          color: '#eee'
        }
      },
      axisLabel: {
        color: '#666'
      },
      axisTick: {
        show: false
      },
      splitArea: {
        show: false,
        areaStyle: {
          color: ['rgba(250,250,250,0.1)', 'rgba(200,200,200,0.1)']
        }
      },
      splitLine: {
        lineStyle: {
          color: ['#eee'],
          type: 'dotted'
        }
      }
    },
    timeline: {
      lineStyle: {
        color: '#008acd'
      },
      controlStyle: {
        normal: {
          color: '#008acd'
        },
        emphasis: {
          color: '#008acd'
        }
      },
      symbol: 'emptyCircle',
      symbolSize: 3
    },
    line: {
      smooth: true,
      symbol: 'emptyCircle',
      symbolSize: 3
    },
    candlestick: {
      itemStyle: {
        normal: {
          color: '#d87a80',
          color0: '#2ec7c9',
          lineStyle: {
            color: '#d87a80',
            color0: '#2ec7c9'
          }
        }
      }
    },
    scatter: {
      symbol: 'circle',
      symbolSize: 4
    },
    map: {
      label: {
        normal: {
          textStyle: {
            color: '#d87a80'
          }
        }
      },
      itemStyle: {
        normal: {
          borderColor: '#eee',
          areaColor: '#ddd'
        },
        emphasis: {
          areaColor: '#fe994e'
        }
      }
    },
    graph: {
      color: colorPalette
    },
    gauge: {
      axisLine: {
        lineStyle: {
          color: [[0.2, '#2ec7c9'], [0.8, '#5ab1ef'], [1, '#d87a80']],
          width: 10
        }
      },
      axisTick: {
        splitNumber: 10,
        length: 15,
        lineStyle: {
          color: 'auto'
        }
      },
      splitLine: {
        length: 22,
        lineStyle: {
          color: 'auto'
        }
      },
      pointer: {
        width: 5
      }
    }
  };

  /**
   * util services
   */
  function formatKMBT(y, formatter) {
    if (!formatter) {
      formatter = function (v) {
        return Math.round(v * 100) / 100;
      };
    }

    y = Math.abs(y);

    if (y >= 1000000000000) {
      return formatter(y / 1000000000000) + 'T';
    } else if (y >= 1000000000) {
      return formatter(y / 1000000000) + 'B';
    } else if (y >= 1000000) {
      return formatter(y / 1000000) + 'M';
    } else if (y >= 1000) {
      return formatter(y / 1000) + 'K';
    } else if (y < 1 && y > 0) {
      return formatter(y);
    } else if (y === 0) {
      return '';
    } else {
      return formatter(y);
    }
  }
  function getTitle(data, config) {
    if (isPlainObject(config.title)) {
      return config.title;
    } // 如果title不是对象，从config中读取title和subtitle的值


    return {
      text: config.title || '',
      subtext: config.subtitle || '',
      x: 50
    };
  }
  function getLegend(data, config) {
    // legend只能是对象，如果是其他格式会清空为空对象
    config.legend = isPlainObject(config.legend) ? config.legend : {};
    const legend = { ...{
        data: [],
        selected: {},
        show: true,
        orient: 'horizontal'
      },
      ...config.legend
    }; // 从data参数中读取name字段，作为legend的data

    if (Array.isArray(data) && (!legend.data || legend.data.length === 0)) {
      data.forEach((series, i) => {
        legend.data.push(series.name);

        if (config.legendLightCount && i >= config.legendLightCount) {
          legend.selected[series.name] = false;
        } else {
          legend.selected[series.name] = true;
        }
      });
    }

    legend.type = config.legendScroll || 'plain';
    return legend;
  }
  function getToolbox(data, config) {
    config.toolbox = isPlainObject(config.toolbox) ? config.toolbox : {};
    const toolbox = { ...{
        show: false
      },
      ...config.toolbox
    };
    return toolbox;
  } // 获取xAxis数据

  function getXAxisTicks(data, config) {
    config.xAxis = isPlainObject(config.xAxis) ? config.xAxis : {};
    const xAxis = { ...{
        show: true,
        axisLine: {
          show: true
        },
        // 显示坐标轴的轴线
        type: 'category',
        data: [],
        boundaryGap: config.type === 'bar'
      },
      ...config.xAxis
    }; // 从第一组点中拿数据, Fixme 如果第一组数据不全，x轴的显示会有问题
    // 默认type: category，必须通过data设置类目数据

    if (data && data[0] && data[0].dataPoints) {
      const ticks = [];
      data[0].dataPoints.forEach(dataPoint => {
        ticks.push(dataPoint.x);
      });
      xAxis.data = ticks;
    }

    return xAxis;
  }
  function getYAxisTicks(data, config) {
    config.yAxis = isPlainObject(config.xAxis) ? config.xAxis : {};
    const yAxis = { ...{
        show: true,
        type: 'value',
        scale: false,
        axisLine: {
          show: false
        },
        axisLabel: {
          formatter: function (v) {
            return formatKMBT(v);
          }
        }
      },
      ...config.yAxis
    };
    return yAxis;
  }
  function getTooltip(data, config) {
    // tooltip只能是对象，如果是其他格式会清空为空对象
    config.tooltip = isPlainObject(config.tooltip) ? config.tooltip : {};
    const tooltip = { ...{
        confine: true
      },
      // tooltip 框限制在图表的区域内
      ...config.tooltip
    };

    if (!tooltip.trigger) {
      switch (config.type) {
        case 'line':
          tooltip.trigger = 'axis';
          break;

        case 'pie':
        case 'bar':
          tooltip.trigger = 'item';
          break;
      }
    }

    if (!tooltip.formatter && config.type === 'pie') {
      tooltip.formatter = '{a} <br/>{b}: {c} ({d}%)';
    }

    return tooltip;
  }
  function getSeries(data, config) {
    const seriesList = [];

    if (!Array.isArray(data)) {
      return seriesList;
    } // 对series.data的处理只针对axis.type 为 'category'的情况
    // 数据可以简化用一个一维数组表示,要跟xAxis.data一一对应
    // TODO 其他情况的支持


    data.forEach(series => {
      const dataPoints = []; // dataPoints可能会不全，从config.xAxis里面循环获取x对应的y的值，否则y值会错位

      if (config.xAxis && config.xAxis.data) {
        config.xAxis.data.forEach(xAxis => {
          let y = null;

          for (let i = 0, len = series.dataPoints.length; i < len; i++) {
            if (series.dataPoints[i].x === xAxis) {
              y = series.dataPoints[i].y;
              break;
            }
          }

          dataPoints.push(y);
        });
      } else {
        series.dataPoints.forEach(dataPoint => {
          dataPoints.push(dataPoint.y);
        });
      }

      const conf = {
        type: config.type || 'line',
        name: series.name,
        data: dataPoints
      };
      seriesList.push(conf);
    });
    return seriesList;
  }

  //
  echarts.registerTheme("shine", shineTheme); // 暴露给外部的方法

  const EVENTS = ["legendselectchanged", "legendselected", "legendunselected", "legendscroll", "datazoom", "datarangeselected", "timelinechanged", "timelineplaychanged", "restore", "dataviewchanged", "magictypechanged", "geoselectchanged", "geoselected", "geounselected", "pieselectchanged", "pieselected", "pieunselected", "mapselectchanged", "mapselected", "mapunselected", "axisareaselected", "focusnodeadjacency", "unfocusnodeadjacency", "brush", "brushselected", "rendered", "finished", "click", "dblclick", "mouseover", "mouseout", "mousemove", "mousedown", "mouseup", "globalout", "contextmenu"];
  var script = {
    name: "NoxEcharts",
    props: {
      config: Object,
      data: Array,
      initOptions: Object,
      // 附加参数，init chart时使用
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
        const config = this.config; // 暂时支持以下选项，如果需要增加修改下面代码

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
        } // 计算容器尺寸


        this.setSize();
        const chart = echarts.init(this.$el, this.theme, this.initOptions);
        chart.setOption(this.manualOptions || this.options || {}, true); // 曝光echarts的events，使得外部可以捕获

        EVENTS.forEach(event => {
          chart.on(event, params => {
            this.$emit(event, params);
          });
        });

        if (this.autoresize) {
          this.lastArea = this.getArea();
          this.__resizeHandler = debounce(() => {
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
          }, 100, {
            leading: true
          });
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
          this.__unwatchOptions = this.$watch("options", (val, oldVal) => {
            if (!this.chart && val) {
              this.init();
            } else {
              this.chart.clear();
              this.chart.setOption(val);
            }
          }, {
            deep: true
          });
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

  function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier
  /* server only */
  , shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
      createInjectorSSR = createInjector;
      createInjector = shadowMode;
      shadowMode = false;
    } // Vue.extend constructor export interop.


    const options = typeof script === 'function' ? script.options : script; // render functions

    if (template && template.render) {
      options.render = template.render;
      options.staticRenderFns = template.staticRenderFns;
      options._compiled = true; // functional template

      if (isFunctionalTemplate) {
        options.functional = true;
      }
    } // scopedId


    if (scopeId) {
      options._scopeId = scopeId;
    }

    let hook;

    if (moduleIdentifier) {
      // server build
      hook = function (context) {
        // 2.3 injection
        context = context || // cached call
        this.$vnode && this.$vnode.ssrContext || // stateful
        this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext; // functional
        // 2.2 with runInNewContext: true

        if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
          context = __VUE_SSR_CONTEXT__;
        } // inject component styles


        if (style) {
          style.call(this, createInjectorSSR(context));
        } // register component module identifier for async chunk inference


        if (context && context._registeredComponents) {
          context._registeredComponents.add(moduleIdentifier);
        }
      }; // used by ssr in case component is cached and beforeCreate
      // never gets called


      options._ssrRegister = hook;
    } else if (style) {
      hook = shadowMode ? function (context) {
        style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
      } : function (context) {
        style.call(this, createInjector(context));
      };
    }

    if (hook) {
      if (options.functional) {
        // register for functional component in vue file
        const originalRender = options.render;

        options.render = function renderWithStyleInjection(h, context) {
          hook.call(context);
          return originalRender(h, context);
        };
      } else {
        // inject component registration as beforeCreate hook
        const existing = options.beforeCreate;
        options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
      }
    }

    return script;
  }

  /* script */
  const __vue_script__ = script;

  /* template */
  var __vue_render__ = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { ref: "chart", staticClass: "echarts" })
  };
  var __vue_staticRenderFns__ = [];
  __vue_render__._withStripped = true;

    /* style */
    const __vue_inject_styles__ = undefined;
    /* scoped */
    const __vue_scope_id__ = undefined;
    /* module identifier */
    const __vue_module_identifier__ = undefined;
    /* functional template */
    const __vue_is_functional_template__ = false;
    /* style inject */
    
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    const __vue_component__ = normalizeComponent(
      { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
      __vue_inject_styles__,
      __vue_script__,
      __vue_scope_id__,
      __vue_is_functional_template__,
      __vue_module_identifier__,
      false,
      undefined,
      undefined,
      undefined
    );

  return __vue_component__;

})));
