import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react-native";
import { Alert, TextInput } from "react-native";
import useDataGenerationModal from "../modals/DataGenerationModal";

const Harness = React.forwardRef((props, ref) => {
  const modal = useDataGenerationModal(props);
  React.useImperativeHandle(ref, () => modal, [modal]);
  return modal.renderModal();
});

describe("DataGenerationModal (useDataGenerationModal)", () => {
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe("Visibility", () => {
    test("modal is hidden by default", () => {
      render(<Harness onDataGenerated={jest.fn()} />);
      expect(screen.queryByText("Generate New Data")).toBeNull();
    });

    test("handleOpenModal opens the modal", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={jest.fn()} />);
      act(() => ref.current.handleOpenModal());
      expect(screen.getByText("Generate New Data")).toBeTruthy();
    });
  });

  describe("Form rendering", () => {
    test("shows all four numeric inputs and action buttons", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={jest.fn()} />);
      act(() => ref.current.handleOpenModal());

      expect(screen.getByText("Min Lifespan:")).toBeTruthy();
      expect(screen.getByText("Max Lifespan:")).toBeTruthy();
      expect(screen.getByText("Tough Cell Count:")).toBeTruthy();
      expect(screen.getByText("Always Ready Count:")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
      expect(screen.getByText("Generate")).toBeTruthy();

      const inputs = screen.UNSAFE_getAllByType(TextInput);
      expect(inputs).toHaveLength(4);
    });

    test("editing inputs updates the form state", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={jest.fn()} />);
      act(() => ref.current.handleOpenModal());

      const inputs = screen.UNSAFE_getAllByType(TextInput);
      fireEvent.changeText(inputs[0], "20");
      fireEvent.changeText(inputs[1], "100");
      fireEvent.changeText(inputs[2], "5");
      fireEvent.changeText(inputs[3], "7");

      expect(ref.current.minLifespanInput).toBe("20");
      expect(ref.current.maxLifespanInput).toBe("100");
      expect(ref.current.toughCellCountInput).toBe("5");
      expect(ref.current.alwaysReadyCountInput).toBe("7");
    });
  });

  describe("Generate", () => {
    test("submits valid inputs and closes the modal", () => {
      const onDataGenerated = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={onDataGenerated} />);
      act(() => ref.current.handleOpenModal());

      const inputs = screen.UNSAFE_getAllByType(TextInput);
      fireEvent.changeText(inputs[0], "30");
      fireEvent.changeText(inputs[1], "90");
      fireEvent.changeText(inputs[2], "3");
      fireEvent.changeText(inputs[3], "4");

      fireEvent.press(screen.getByText("Generate"));

      expect(onDataGenerated).toHaveBeenCalledTimes(1);
      const generated = onDataGenerated.mock.calls[0][0];
      // 3 Tough Cell + 4 Always Ready = 7 entries
      expect(generated).toHaveLength(7);
      expect(generated.filter((b) => b.brand === "Tough Cell")).toHaveLength(3);
      expect(generated.filter((b) => b.brand === "Always Ready")).toHaveLength(
        4,
      );
      expect(screen.queryByText("Generate New Data")).toBeNull();
    });

    test("alerts when min >= max", () => {
      const onDataGenerated = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={onDataGenerated} />);
      act(() => ref.current.handleOpenModal());

      const inputs = screen.UNSAFE_getAllByType(TextInput);
      fireEvent.changeText(inputs[0], "100");
      fireEvent.changeText(inputs[1], "50");

      fireEvent.press(screen.getByText("Generate"));
      expect(onDataGenerated).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid Input",
        expect.stringContaining("Min Lifespan must be less than"),
      );
      // Modal remains open
      expect(screen.getByText("Generate New Data")).toBeTruthy();
    });

    test("alerts when Tough Cell count is out of range", () => {
      const onDataGenerated = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={onDataGenerated} />);
      act(() => ref.current.handleOpenModal());

      const inputs = screen.UNSAFE_getAllByType(TextInput);
      fireEvent.changeText(inputs[2], "999");

      fireEvent.press(screen.getByText("Generate"));
      expect(onDataGenerated).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid Input",
        expect.stringContaining("ToughCell"),
      );
    });

    test("alerts when Always Ready count is out of range", () => {
      const onDataGenerated = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onDataGenerated={onDataGenerated} />);
      act(() => ref.current.handleOpenModal());

      const inputs = screen.UNSAFE_getAllByType(TextInput);
      fireEvent.changeText(inputs[3], "0");

      fireEvent.press(screen.getByText("Generate"));
      expect(onDataGenerated).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid Input",
        expect.stringContaining("AlwaysReady"),
      );
    });
  });

  describe("Cancel", () => {
    test("Cancel hides the modal and fires onClose", () => {
      const onClose = jest.fn();
      const ref = React.createRef();
      render(
        <Harness ref={ref} onDataGenerated={jest.fn()} onClose={onClose} />,
      );
      act(() => ref.current.handleOpenModal());
      fireEvent.press(screen.getByText("Cancel"));

      expect(screen.queryByText("Generate New Data")).toBeNull();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
