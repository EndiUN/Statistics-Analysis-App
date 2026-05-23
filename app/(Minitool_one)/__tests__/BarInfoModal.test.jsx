import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import BarInfoModal from "../modals/BarInfoModal";

describe("BarInfoModal", () => {
  const baseProps = {
    visible: true,
    barData: { brand: "Tough Cell", lifespan: 95 },
    onClose: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nothing when barData is null", () => {
    const { toJSON } = render(<BarInfoModal {...baseProps} barData={null} />);
    expect(toJSON()).toBeNull();
  });

  test("renders title, brand, lifespan and action buttons when visible", () => {
    render(<BarInfoModal {...baseProps} />);
    expect(screen.getByText("Battery Information")).toBeTruthy();
    expect(screen.getByText("Company:")).toBeTruthy();
    expect(screen.getByText("Tough Cell")).toBeTruthy();
    expect(screen.getByText("Lifespan (hours):")).toBeTruthy();
    expect(screen.getByText("95")).toBeTruthy();
    expect(screen.getByText("Remove This Battery")).toBeTruthy();
    expect(screen.getByText("Close")).toBeTruthy();
  });

  test("renders 'Always Ready' brand correctly", () => {
    render(
      <BarInfoModal
        {...baseProps}
        barData={{ brand: "Always Ready", lifespan: 42 }}
      />,
    );
    expect(screen.getByText("Always Ready")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  test("pressing 'Close' calls onClose", () => {
    const onClose = jest.fn();
    render(<BarInfoModal {...baseProps} onClose={onClose} />);
    fireEvent.press(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("pressing 'Remove This Battery' triggers onDelete then onClose", () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();
    render(
      <BarInfoModal {...baseProps} onDelete={onDelete} onClose={onClose} />,
    );
    fireEvent.press(screen.getByText("Remove This Battery"));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("does not surface modal contents when visible=false", () => {
    render(<BarInfoModal {...baseProps} visible={false} />);
    expect(screen.queryByText("Battery Information")).toBeNull();
    expect(screen.queryByText("Remove This Battery")).toBeNull();
  });
});
