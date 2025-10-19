import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import Sidebar from "../Sidebar";

describe("Sidebar Component - Unit Test", () => {
  it("renders Dashboard link", () => {
    render(<Sidebar isMobileMenuOpen={false} setIsMobileMenuOpen={() => {}} />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
