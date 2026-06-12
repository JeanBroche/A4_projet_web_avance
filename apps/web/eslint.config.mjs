// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import vueA11y from 'eslint-plugin-vuejs-accessibility'

export default withNuxt(
  {
    plugins: {
      'vuejs-accessibility': vueA11y
    },
    rules: {
      'vuejs-accessibility/alt-text': 'warn',
      'vuejs-accessibility/label-has-for': 'warn',
      'vuejs-accessibility/click-events-have-key-events': 'warn',
      'vuejs-accessibility/mouse-events-have-key-events': 'warn',
      'vuejs-accessibility/anchor-has-content': 'warn',
      'vuejs-accessibility/aria-props': 'warn',
      'vuejs-accessibility/role-has-required-aria-props': 'warn'
    }
  }
)
