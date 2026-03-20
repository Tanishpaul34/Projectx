import { render } from '@testing-library/react'
import Home from './page'

describe('Home', () => {
  it('matches snapshot', () => {
    const { container } = render(<Home />)
    expect(container).toMatchSnapshot()
  })
})
