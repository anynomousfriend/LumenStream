import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
import App from './App';

// Mock the GSAP animations so they don't block tests
vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(),
    to: vi.fn(),
  }
}));

// Mock the Stellar library methods
vi.mock('./lib/stellar', () => ({
  CONTRACT_ID: 'CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q',
  setContractId: vi.fn(),
  kit: {
    authModal: vi.fn().mockResolvedValue({ address: 'GBQFR2D2UVELX4PSHS2BEANTRGCQXRPGTUQW357HSWTAJKD7USL3357P' }),
  },
  invokeRecordPayments: vi.fn(),
  submitTransaction: vi.fn(),
  fetchPayments: vi.fn().mockResolvedValue([]),
  fetchEvents: vi.fn().mockResolvedValue([]),
}));

describe('App Component', () => {
  it('renders the header and connect button', () => {
    render(<App />);
    expect(screen.getByText(/Streamflow Data for/i)).toBeDefined();
    expect(screen.getByText('Connect Wallet')).toBeDefined();
  });

  it('allows user to input a contract ID and set it', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('CA5HUAE5DEFVN62OCCI6NCQ4LSZ2AR67FGS4XC4YURJVLB2JVRZCDM6Q') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'NEW_CONTRACT_ID' } });
    expect(input.value).toBe('NEW_CONTRACT_ID');
    
    const setBtn = screen.getByText('Set Contract');
    fireEvent.click(setBtn);
    // Should show toast, meaning no crash occurred
  });

  it('allows user to type receivers and amounts', () => {
    render(<App />);
    const receiverInput = screen.getByPlaceholderText('GB..., GC...') as HTMLInputElement;
    fireEvent.change(receiverInput, { target: { value: 'G123, G456' } });
    expect(receiverInput.value).toBe('G123, G456');

    const amountInput = screen.getByPlaceholderText('100, 200') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '50, 100' } });
    expect(amountInput.value).toBe('50, 100');
  });
});
