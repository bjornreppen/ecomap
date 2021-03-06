import React from 'react'
import DeckGL from 'deck.gl'
import {Paper} from 'material-ui'
import EcoHexagonLayer from '../map/layer/EcoHexagonLayer'
import alces from '../../data/sample/artskart_48103.json'
import readGeoJsonPoints from '../translate/GeoJson.js'
import ramp from '../graphics/color/ramps/'

const viewport = {
  width: 900,
  height: 800,
  longitude: 15,
  latitude: 64,
  zoom: 4.3,
  pitch: 30,
  bearing: -20
}

const points = readGeoJsonPoints(alces)

export default HexagonStoryLocal => {
  let layer = new EcoHexagonLayer({
    colorRamp: ramp.magma,
    data: points,
    viewport: viewport
  })

  return <Paper style={{backgroundColor: '#ccc', width: viewport.width, height: viewport.height, margin: '10px'}}>
    <DeckGL {...viewport} layers={[layer]}
      onWebGLInitialized={(gl) => {
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
      }}
  /></Paper>
}
