import { Filter, GlProgram, Texture, UniformGroup } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
	vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
	position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
	position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
	return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
	return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
	gl_Position = filterVertexPosition();
	vTextureCoord = filterTextureCoord();
}
`;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uSpecTexture;

uniform vec2 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uRimColor;
uniform float uAmbient;
uniform float uDiffuse;
uniform float uSpecular;
uniform float uShininess;
uniform float uFlicker;

void main(void) {
	vec4 base = texture(uTexture, vTextureCoord);
	if (base.a <= 0.001) {
		finalColor = base;
		return;
	}

	vec3 color = base.rgb / base.a;
	vec3 normal = normalize(texture(uNormalTexture, vTextureCoord).rgb * 2.0 - 1.0);
	float specMask = texture(uSpecTexture, vTextureCoord).r;

	vec3 light = normalize(vec3(uLightDir, 0.78));
	vec3 view = vec3(0.0, 0.0, 1.0);
	vec3 halfVector = normalize(light + view);

	float lambert = max(dot(normal, light), 0.0);
	float spec = pow(max(dot(normal, halfVector), 0.0), uShininess) * specMask;
	float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.2) * specMask;

	vec3 lit = color * (uAmbient + lambert * uDiffuse * uFlicker);
	lit += uLightColor * spec * uSpecular * uFlicker;
	lit += uRimColor * rim * 0.12 * uFlicker;

	finalColor = vec4(lit * base.a, base.a);
}
`;

export class NormalLightFilter extends Filter {
	constructor(normalTexture: Texture, specTexture: Texture) {
		super({
			glProgram: GlProgram.from({
				name: 'supermassive-normal-light-filter',
				vertex,
				fragment,
			}),
			resources: {
				normalLightUniforms: new UniformGroup({
					uLightDir: { value: new Float32Array([0.68, -0.72]), type: 'vec2<f32>' },
					uLightColor: { value: new Float32Array([1.0, 0.82, 0.52]), type: 'vec3<f32>' },
					uRimColor: { value: new Float32Array([0.5, 0.95, 1.0]), type: 'vec3<f32>' },
					uAmbient: { value: 0.82, type: 'f32' },
					uDiffuse: { value: 0.34, type: 'f32' },
					uSpecular: { value: 0.42, type: 'f32' },
					uShininess: { value: 18, type: 'f32' },
					uFlicker: { value: 1, type: 'f32' },
				}),
				uNormalTexture: normalTexture.source,
				uNormalSampler: normalTexture.source.style,
				uSpecTexture: specTexture.source,
				uSpecSampler: specTexture.source.style,
			},
		});
	}

	get uniforms() {
		return this.resources.normalLightUniforms.uniforms;
	}

	set normalTexture(texture: Texture) {
		this.resources.uNormalTexture = texture.source;
		this.resources.uNormalSampler = texture.source.style;
	}

	set specTexture(texture: Texture) {
		this.resources.uSpecTexture = texture.source;
		this.resources.uSpecSampler = texture.source.style;
	}
}
