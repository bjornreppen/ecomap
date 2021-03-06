import React from 'react'
import renderer from 'react-test-renderer'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import muiTheme from '../../../theme_jest'

import NatureCard from './NatureCard'

it('renders correctly', () => {
  const tree = renderer.create(
    <MuiThemeProvider muiTheme={muiTheme}>
      <NatureCard ninkode='T44' properties={{ a: 1 }} />
    </MuiThemeProvider>
      )
  expect(tree.toJSON()).toMatchSnapshot()
})
