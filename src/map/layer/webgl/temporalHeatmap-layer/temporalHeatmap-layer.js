import { Layer } from 'deck.gl'
import { GL, Framebuffer, Texture2D, Model, Geometry } from 'luma.gl'

import vs from './temporalHeatmap-animation-vertex.glsl'
import fs from './temporalHeatmap-animation-fragment.glsl'
import fsBlurHorizontal from './horizontalGaussian-fragment.glsl'
import fsBlurVertical from './verticalGaussian-fragment.glsl'
import fsScreen from './grayscaleToColor-fragment.glsl'
import vsScreen from './screenQuad-vertex.glsl'

const DEFAULT_COLOR = [0, 0, 0, 255]

const defaultProps = {
  time: 0,
  radiusScale: 1,
  fillOpacity: 1.0,
  height: 1.0,
  fp64: false,
  getPosition: x => x.position,
  getRadius: x => x.radius || 1,
  getColor: x => x.color || DEFAULT_COLOR,
  _dataComparator: (a, b) => a.length === b.length
}

export default class TemporalHeatmapLayer extends Layer {
  constructor (options) {
    const opts = {
      data: options.data,
      dataUrl: options.dataUrl, // 'http://nodeyoda.westeurope.cloudapp.azure.com/whitenoise.jpg',
      // 'http://nodeyoda.westeurope.cloudapp.azure.com/b.jpg', // options.dataUrl,
      colorRamp: options.colorRamp,
      height: options.height,
      radiusScale: options.radiusScale,
      getPosition: d => [d[0], d[1]],
      getRadius: d => options.radius,
      fillOpacity: options.fillOpacity,
      latitude: options.latitude,
      longitude: options.longitude,
      zoom: options.zoom,
      aspect: options.aspect,
      time: options.time
    }
    console.log(opts.time)
    super(opts)
    //    window.luma.log.priority = 4
  }

  getShaders (id) {
    const { shaderCache } = this.context
    return { vs, fs, modules: ['project'], shaderCache }
  }

  getShadersBlurVertical (id) {
    const { shaderCache } = this.context
    return { vs: vsScreen, fs: fsBlurVertical, modules: [], shaderCache }
  }

  getShadersBlurHorizontal (id) {
    const { shaderCache } = this.context
    return { vs: vsScreen, fs: fsBlurHorizontal, modules: [], shaderCache }
  }

  getShadersColorRamp (id) {
    const { shaderCache } = this.context
    return { vs: vsScreen, fs: fsScreen, modules: [], shaderCache }
  }

  initializeState () {
    const { gl } = this.context
    var fbHeat = new Framebuffer(gl, { depth: false })
    var fbBlur = new Framebuffer(gl, { depth: false })

    this.loadTexture(gl, null, 'temporalTexture', this.props.dataUrl)

    var rampTexture = new Texture2D(gl, {
      format: GL.RGB,
      pixels: this.props.colorRamp,
      parameters: {
        [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
        [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE
      },
      mipmaps: false
    })

    this.setState({
      model: this._getModel(gl),
      modelBlurVertical: this._getModelBlurVertical(gl),
      modelBlurHorizontal: this._getModelBlurHorizontal(gl),
      modelColorRamp: this._getModelColorRamp(gl),
      fbHeat,
      fbBlur,
      rampTexture
    })
  }

  updateAttribute ({ props, oldProps, changeFlags }) {}

  updateState ({ props, oldProps, changeFlags }) {
    super.updateState({ props, oldProps, changeFlags })
    if (props.fp64 !== oldProps.fp64) {
      const { gl } = this.context
      this.setState({
        model: this._getModel(gl),
        modelColorRamp: this._getModelColorRamp(gl)
      })
    }
    if (props.colorRamp !== oldProps.colorRamp) {
      const gl = this.context.gl
      this.state.rampTexture.bind(0)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        props.colorRamp.length / 3,
        1,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        props.colorRamp
      )
    }
    this.updateAttribute({ props, oldProps, changeFlags })
  }

  draw ({ uniforms }) {
    if (!this.state.temporalTexture) return
    const { gl } = this.context
    var { fbHeat, fbBlur } = this.state
    const iResolution = [gl.canvas.width, gl.canvas.height]
    const size = { width: gl.canvas.width, height: gl.canvas.height }
    fbHeat.resize(size)
    fbHeat.bind(gl.FRAMEBUFFER)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.blendFunc(gl.ONE, gl.ONE)

    this.state.model.draw({
      framebuffer: fbHeat,
      uniforms: {
        time: this.props.time,
        aspect: this.props.aspect + 1.86666666666667 - 0.5,
        latitude: this.props.latitude + 63,
        longitude: this.props.longitude * 3.0 + 17,
        zoom: this.props.zoom + 7.5 - 0.5,
        temporalTexture: this.state.temporalTexture
      }
    })

    fbBlur.resize(size)
    fbBlur.bind(gl.FRAMEBUFFER)
    gl.clear(gl.COLOR_BUFFER_BIT)

    this.state.modelBlurHorizontal.draw({
      framebuffer: fbBlur,
      uniforms: {
        sourceTexture: fbHeat.texture,
        iResolution: iResolution
      }
    })

    fbHeat.bind(gl.FRAMEBUFFER)
    gl.clear(gl.COLOR_BUFFER_BIT)

    this.state.modelBlurVertical.draw({
      framebuffer: fbHeat,
      uniforms: {
        sourceTexture: fbBlur.texture,
        iResolution: iResolution
      }
    })

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    )

    this.state.modelColorRamp.draw({
      uniforms: {
        colorRamp: this.state.rampTexture,
        height: this.props.height * 2.86,
        sourceTexture: fbHeat.texture,
        fillOpacity: this.props.fillOpacity,
        iResolution: iResolution
      }
    })
  }

  _getModel (gl) {
    return this._createModel(gl, this.getShaders())
  }

  _getModelBlurHorizontal (gl) {
    return this._createModel(gl, this.getShadersBlurHorizontal())
  }

  _getModelBlurVertical (gl) {
    return this._createModel(gl, this.getShadersBlurVertical())
  }

  _getModelColorRamp (gl) {
    return this._createModel(gl, this.getShadersColorRamp())
  }

  _createModel (gl, shaders) {
    return new Model(gl, Object.assign(shaders, this._getUnitCircle(shaders)))
  }

  _getUnitCircle (shaders) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0]
    return {
      id: this.props.id,
      geometry: new Geometry({
        drawMode: GL.TRIANGLE_FAN,
        positions: new Float32Array(positions)
      }),
      shaderCache: this.context.shaderCache
    }
  }

  loadTexture (gl, model, bitmapName, filename) {
    /* global Image */
    const image = new Image()
    image.crossOrigin = 'Anonymous'
    image.onload = (a, b) => {
      var t = new Texture2D(gl, {
        format: GL.RGB,
        data: image,
        parameters: {
          [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
          [GL.TEXTURE_MIN_FILTER]: GL.LINEAR
        },
        mipmaps: false,
        unpackFlipY: true
      })
      this.setState({ temporalTexture: t })
    }

    image.onerror = () => {
      throw new Error(
        `Could not load texture ${bitmapName} from ${image.src}`
      )
    }

    image.src = filename
  }
}

TemporalHeatmapLayer.layerName = 'TemporalHeatmapLayer'
TemporalHeatmapLayer.defaultProps = defaultProps
