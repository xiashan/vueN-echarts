/**
 * util services
 */
import isPlainObject from 'lodash/isPlainObject';

export function formatKMBT(y, formatter) {
  if (!formatter) {
    formatter = function(v) {
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

export function getTitle(data, config) {
  if (isPlainObject(config.title)) {
    return config.title;
  }
  // 如果title不是对象，从config中读取title和subtitle的值
  return {
    text: config.title || '',
    subtext: config.subtitle || '',
    x: 50
  };
}

export function getLegend(data, config) {
  // legend只能是对象，如果是其他格式会清空为空对象
  config.legend = isPlainObject(config.legend) ? config.legend : {};
  const legend = {
    ...{ data: [], selected: {}, show: true, orient: 'horizontal' },
    ...config.legend
  };

  // 从data参数中读取name字段，作为legend的data
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

export function getToolbox(data, config) {
  config.toolbox = isPlainObject(config.toolbox) ? config.toolbox : {};
  const toolbox = {
    ...{ show: false },
    ...config.toolbox
  };
  return toolbox;
}

// 获取xAxis数据
export function getXAxisTicks(data, config) {
  config.xAxis = isPlainObject(config.xAxis) ? config.xAxis : {};
  const xAxis = {
    ...{
      show: true,
      axisLine: { show: true }, // 显示坐标轴的轴线
      type: 'category',
      data: [],
      boundaryGap: config.type === 'bar'
    },
    ...config.xAxis
  };

  // 从第一组点中拿数据, Fixme 如果第一组数据不全，x轴的显示会有问题
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

export function getYAxisTicks(data, config) {
  config.yAxis = isPlainObject(config.xAxis) ? config.xAxis : {};
  const yAxis = {
    ...{
      show: true,
      type: 'value',
      scale: false,
      axisLine: { show: false },
      axisLabel: {
        formatter: function(v) {
          return formatKMBT(v);
        },
      },
    },
    ...config.yAxis,
  };
  return yAxis;
}

export function getTooltip(data, config) {
  // tooltip只能是对象，如果是其他格式会清空为空对象
  config.tooltip = isPlainObject(config.tooltip) ? config.tooltip : {};
  const tooltip = {
    ...{ confine: true }, // tooltip 框限制在图表的区域内
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

export function getSeries(data, config) {
  const seriesList = [];
  if (!Array.isArray(data)) {
    return seriesList;
  }
  // 对series.data的处理只针对axis.type 为 'category'的情况
  // 数据可以简化用一个一维数组表示,要跟xAxis.data一一对应
  // TODO 其他情况的支持
  data.forEach(series => {
    const dataPoints = [];
    // dataPoints可能会不全，从config.xAxis里面循环获取x对应的y的值，否则y值会错位
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
