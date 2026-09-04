import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxOption } from './Combobox'

const options: ComboboxOption[] = [
  { value: '1', label: 'Corte' },
  { value: '2', label: 'Barba' },
  { value: '3', label: 'Sobrancelha' },
]

function openTrigger() {
  return screen.getByRole('button', { name: /selecione/i })
}

describe('Combobox accessibility', () => {
  it('exposes the open list as a listbox with option rows', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Serviço" value="" options={options} onSelect={vi.fn()} />)

    await user.click(openTrigger())

    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('navigates with arrow keys and selects the highlighted option with Enter', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Combobox label="Serviço" value="" options={options} onSelect={onSelect} />)

    await user.click(openTrigger())
    await screen.findByRole('listbox')
    // Opening already highlights the first row (Corte); one ArrowDown moves to the second.
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledWith(options[1])
  })

  it('closes the listbox on Escape', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Serviço" value="" options={options} onSelect={vi.fn()} />)

    await user.click(openTrigger())
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('gives the search input a real accessible name', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Serviço" value="" options={options} onSelect={vi.fn()} />)

    await user.click(openTrigger())

    expect(await screen.findByRole('textbox', { name: /buscar/i })).toBeInTheDocument()
  })

  it('renders the clear affordance as a real, tab-reachable button', () => {
    render(<Combobox label="Serviço" value="Corte" options={options} onSelect={vi.fn()} onClear={vi.fn()} />)

    const clearButton = screen.getByRole('button', { name: /limpar/i })
    expect(clearButton.tabIndex).toBe(0)
  })
})
