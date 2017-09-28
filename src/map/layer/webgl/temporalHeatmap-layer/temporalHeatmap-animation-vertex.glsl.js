export default `\
#define SHADER_NAME temporalHeatmap-layer-vertex-shader

attribute vec3 positions;

uniform vec3 positionCenter;
uniform float radius;

uniform float opacity;
uniform float radiusScale;
uniform float height;
uniform float fillOpacity;

varying vec2 unitPosition;

void main(void) {
  // Multiply out radius and clamp to limits
  float outerRadiusPixels = clamp(
    project_scale(radiusScale * radius),
    0., 123456789.
  );

  // position on the containing square in [-1, 1] space
  unitPosition = positions.xy;

  // Find the center of the point and add the current vertex
  vec3 center = project_position(positionCenter);
  vec3 vertex = positions * outerRadiusPixels;
  gl_Position = project_to_clipspace(vec4(center + vertex, 1.0));
}
`