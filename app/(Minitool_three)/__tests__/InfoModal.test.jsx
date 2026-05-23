import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import InfoModal from "../modals/InfoModal";

describe("InfoModal", () => {
  const defaultProps = {
    visible: true,
    title: "Two Equal Groups",
    message: "Divides plot into groups + shows median, low, and high values.",
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders title and message when visible", () => {
    render(<InfoModal {...defaultProps} />);
    expect(screen.getByText("Two Equal Groups")).toBeTruthy();
    expect(
      screen.getByText(
        "Divides plot into groups + shows median, low, and high values.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Got it")).toBeTruthy();
  });

  test("does not render content when visible is false", () => {
    render(<InfoModal {...defaultProps} visible={false} />);
    // Modal with visible=false should not surface its children
    expect(screen.queryByText("Two Equal Groups")).toBeNull();
    expect(screen.queryByText("Got it")).toBeNull();
  });

  test("calls onClose when the 'Got it' button is pressed", () => {
    const onClose = jest.fn();
    render(<InfoModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByText("Got it"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when the backdrop is pressed", () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <InfoModal {...defaultProps} onClose={onClose} />,
    );
    const Pressable = require("react-native").Pressable;
    const pressables = UNSAFE_getAllByType(Pressable);
    // First Pressable is the backdrop
    fireEvent.press(pressables[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("renders updated title/message when props change", () => {
    const { rerender } = render(<InfoModal {...defaultProps} />);
    expect(screen.getByText("Two Equal Groups")).toBeTruthy();

    rerender(
      <InfoModal
        {...defaultProps}
        title="Grids Mode"
        message="Divides plot into grid groups."
      />,
    );

    expect(screen.queryByText("Two Equal Groups")).toBeNull();
    expect(screen.getByText("Grids Mode")).toBeTruthy();
    expect(screen.getByText("Divides plot into grid groups.")).toBeTruthy();
  });
});
