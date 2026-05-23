import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import useBarGenerationModal from "../modals/BarGenerationModal";

// Tiny harness: hooks can't be rendered directly, so wrap and expose handlers.
const Harness = React.forwardRef((props, ref) => {
  const modal = useBarGenerationModal(props);
  React.useImperativeHandle(ref, () => modal, [modal]);
  return modal.renderModal();
});

describe("BarGenerationModal (useBarGenerationModal)", () => {
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
      render(<Harness onBarAdded={jest.fn()} currentBarCount={0} />);
      expect(screen.queryByText("Add a New Battery")).toBeNull();
    });

    test("handleOpenModal makes the modal visible", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={jest.fn()} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());
      expect(screen.getByText("Add a New Battery")).toBeTruthy();
    });

    test("does not open when bar count is at the limit, alerts the user", () => {
      const ref = React.createRef();
      render(
        <Harness
          ref={ref}
          onBarAdded={jest.fn()}
          currentBarCount={20}
          MAX_BAR_COUNT={20}
        />,
      );
      act(() => ref.current.handleOpenModal());
      expect(screen.queryByText("Add a New Battery")).toBeNull();
      expect(alertSpy).toHaveBeenCalledWith(
        "Limit Reached",
        expect.stringContaining("more than 20 batteries"),
      );
    });
  });

  describe("Form interaction", () => {
    test("renders inputs, brand selector and action buttons", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={jest.fn()} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());
      expect(screen.getByText("Lifespan (1-130):")).toBeTruthy();
      expect(screen.getByText("Brand:")).toBeTruthy();
      expect(screen.getByText("Tough Cell")).toBeTruthy();
      expect(screen.getByText("Always Ready")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
      expect(screen.getByText("Add Bar")).toBeTruthy();
    });

    test("changing the brand selection updates state", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={jest.fn()} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());

      fireEvent.press(screen.getByText("Always Ready"));
      expect(ref.current.barBrandInput).toBe("Always Ready");
    });

    test("typing in the lifespan input updates state", () => {
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={jest.fn()} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());

      const input = screen.UNSAFE_getAllByType(
        require("react-native").TextInput,
      )[0];
      fireEvent.changeText(input, "75");
      expect(ref.current.barLifespanInput).toBe("75");
    });
  });

  describe("Add Bar", () => {
    test("submits a valid bar and closes the modal", () => {
      const onBarAdded = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={onBarAdded} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());

      const input = screen.UNSAFE_getAllByType(
        require("react-native").TextInput,
      )[0];
      fireEvent.changeText(input, "85");
      fireEvent.press(screen.getByText("Add Bar"));

      expect(onBarAdded).toHaveBeenCalledWith({
        brand: "Tough Cell",
        lifespan: 85,
      });
      expect(screen.queryByText("Add a New Battery")).toBeNull();
    });

    test("rejects out-of-range lifespan with an alert", () => {
      const onBarAdded = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={onBarAdded} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());

      const input = screen.UNSAFE_getAllByType(
        require("react-native").TextInput,
      )[0];
      fireEvent.changeText(input, "999");
      fireEvent.press(screen.getByText("Add Bar"));

      expect(onBarAdded).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid Lifespan",
        expect.stringContaining("between 1 and 130"),
      );
      // Modal stays open so the user can correct it
      expect(screen.getByText("Add a New Battery")).toBeTruthy();
    });

    test("rejects non-numeric lifespan with an alert", () => {
      const onBarAdded = jest.fn();
      const ref = React.createRef();
      render(<Harness ref={ref} onBarAdded={onBarAdded} currentBarCount={0} />);
      act(() => ref.current.handleOpenModal());

      const input = screen.UNSAFE_getAllByType(
        require("react-native").TextInput,
      )[0];
      fireEvent.changeText(input, "abc");
      fireEvent.press(screen.getByText("Add Bar"));

      expect(onBarAdded).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe("Cancel", () => {
    test("Cancel closes the modal and fires onClose", () => {
      const onClose = jest.fn();
      const ref = React.createRef();
      render(
        <Harness
          ref={ref}
          onBarAdded={jest.fn()}
          onClose={onClose}
          currentBarCount={0}
        />,
      );
      act(() => ref.current.handleOpenModal());
      fireEvent.press(screen.getByText("Cancel"));
      expect(screen.queryByText("Add a New Battery")).toBeNull();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
