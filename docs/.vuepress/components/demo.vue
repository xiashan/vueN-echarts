<template>
    <div class="demo">

        <div class="py-5">
            <div class="form-group">
                <label>Bar Chart:</label>
                <nox-echarts
                  :options="bar"
                  ref="bar"
                  autoresize
                >
                </nox-echarts>
            </div>
        </div>
    </div>
</template>

<script>
  import NoxEcharts from '../../../src/components/ECharts';
  import 'echarts/lib/chart/bar';
  import getBar from '../data/bar'

  export default {
    components: { NoxEcharts },
    name: 'EchartsDemo',
    data () {
      return {
        bar: getBar(),
        initOptions: {
          renderer: 'canvas'
        },
      }
    },
    mounted () {
      // this.$refs.picker.open = true
    },
    methods: {
      refresh () {
        // simulating async data from server
        this.seconds = 3
        let bar = this.$refs.bar
        bar.showLoading({
          text: 'Loading…',
          color: '#4ea397',
          maskColor: 'rgba(255, 255, 255, 0.4)'
        })
        let timer = setInterval(() => {
          this.seconds--;
          if (this.seconds === 0) {
            clearTimeout(timer);
            bar.hideLoading();
            this.bar = getBar();
          }
        }, 1000)
      },
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
    h1, h2 {
        font-weight: normal;
    }

    a {
        color: #42b983;
    }

    small.form-text {
        display: initial;
    }
    small.form-text::before {
        content: ' - ';
    }

    table {
      border-collapse: collapse;
      margin: 0;
      display: table;
      overflow-x: auto;
    }

    tr {
      border-top: none;
    }
    tr:nth-child(2n) {
      background-color: #fff !important;
    }

    th, td {
      border: none;
      text-align: center !important;
    }
</style>
