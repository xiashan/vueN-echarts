---
sidebar: auto
sidebarDepth: 2
---

# vueN-echarts

> VueN echarts based on https://echarts.apache.org/zh/index.html

Echarts component for vue. 


## Installation

```sh
npm i vuen-echarts --save
```

or 

```sh
yarn add vuen-echarts
```

import to use:

```JS
import NoxEcharts from 'vuen-echarts'
```

## Usage

Register the component
```JS
import echarts from 'echarts';
import NoxEcharts from 'vuen-echarts';

export default {
  components: { NoxEcharts },
}
```

```vue
    <nox-echarts
      :config="config"
      :data="data"
      ref="line"
    >
```

## Example

<ClientOnly>
<demo />
</ClientOnly>

## Props

| Props               | Type      | Default                                         | Description  |
| --------------------|:----------| ------------------------------------------------|--------------|
| config               | Object    | { <br/>title, <br/>subtitle, <br/>legendLightCount, // // 默认显示几条线<br/>legendScroll // legend太长出现滚动效果<br/>}                              |              |
| data                | Array     |                                                 |              |
| initOptions         | Object    | { devicePixelRatio, renderer, width, height }   |              |
| theme               | Object or String | shine                                    |              |
| autoresize          | Boolean   | true                                            |              |
| manualUpdate        | Boolean   | false                                           | 是否手动更新   |
