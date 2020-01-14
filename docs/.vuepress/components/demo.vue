<template>
    <div class="demo">
        <div class="py-5">
            <div class="form-group" style="margin-top: 16px;">
                <label>Line Chart:</label>
                <div class="graph-wrapper">
                  <nox-echarts
                    :config="config"
                    :data="data"
                    ref="line"
                  >
                  </nox-echarts>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
  import NoxEcharts from '../../../src/components/ECharts';
  import echarts from 'echarts';

  export default {
    components: { NoxEcharts },
    name: 'EchartsDemo',
    data () {
      return {
        data: [
          {
            name: 'click',
            dataPoints: [
              {x: '2019-06-25', y: 4568},
              {x: '2019-06-26', y: 345}
            ]
          },
          {
            name: 'impresssions',
            dataPoints: [
              {x: '2019-06-25', y: 15792},
              {x: '2019-06-26', y: 0}
            ]
          }
        ],
        config: {
          type: 'line',
          legendScroll: 'scroll',
        },
        initOptions: {
          renderer: 'svg'
        },
      }
    }
  }
</script>
