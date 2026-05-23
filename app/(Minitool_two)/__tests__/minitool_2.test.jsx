/**
 * Integration tests for the Minitool 2 page.
 *
 * Covers the cross-component flow: rendering with the default scenario,
 * fetching scenarios from the backend (axios mocked), opening the
 * save/load modal, saving a new scenario, deleting a scenario, and
 * opening the upload modal.
 *
 * Heavy children (DotPlot, LegendPanel, picker, upload modal) are mocked
 * so this file focuses on the page-level integration, not visualisation.
 */

import React from 'react';
import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from '@testing-library/react-native';
import axios from 'axios';

// --- Child component mocks ------------------------------------------------ //

jest.mock('../components/DotPlot', () => {
  const { Text } = require('react-native');
  return function MockDotPlot(props) {
    return (
      <Text testID="dot-plot">
        DotPlot:{props.settings?.chartName}
      </Text>
    );
  };
});

jest.mock('../components/LegendPanel', () => {
  const { Text } = require('react-native');
  return function MockLegendPanel() {
    return <Text testID="legend-panel">Legend</Text>;
  };
});

jest.mock('../../../components/UploadScenarioModal', () => {
  const { Text } = require('react-native');
  return function MockUploadScenarioModal({ visible }) {
    return visible ? (
      <Text testID="upload-scenario-modal">Upload Modal Open</Text>
    ) : null;
  };
});

jest.mock('react-native-picker-select', () => {
  const { Text } = require('react-native');
  return function MockPicker({ items, onValueChange, value }) {
    return (
      <Text
        testID="scenario-picker"
        onPress={() => {
          // Simulate the user picking the *second* item in the list,
          // so the test does not depend on a specific scenario name.
          const next = items?.[1]?.value;
          if (next) onValueChange(next);
        }}
      >
        picker:{value}
      </Text>
    );
  };
});

// --- Imports that depend on the mocks above ------------------------------- //

import Minitool2Page from '../minitool_2';

/**
 * Helper that mounts the page and waits for the initial fetchScenarios()
 * call to settle, so subsequent assertions don't trigger React act() warnings.
 */
const renderPage = async () => {
  const utils = render(<Minitool2Page />);
  await waitFor(() => expect(axios.get).toHaveBeenCalled());
  return utils;
};

// --- Sample server responses --------------------------------------------- //

const dbScenario = {
  _id: 'abc123',
  name: 'Saved Cholesterol Trial',
  toolType: 'minitool2',
  data: {
    dataBefore: [180, 190, 200, 210],
    dataAfter: [160, 170, 175, 180],
  },
};

const otherToolScenario = {
  _id: 'xyz789',
  name: 'Should Be Filtered Out',
  toolType: 'minitool1',
  data: { bars: [], minLifespan: 0, maxLifespan: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();
  global.alert = jest.fn();
  axios.get.mockResolvedValue({
    data: { success: true, data: [dbScenario, otherToolScenario] },
  });
});

describe('Minitool2Page — initial render', () => {
  test('renders the page title, legend, picker and dot plot', async () => {
    await renderPage();

    expect(
      screen.getByText(/Minitool 2: Dot Plot/i),
    ).toBeTruthy();
    expect(screen.getByTestId('legend-panel')).toBeTruthy();
    expect(screen.getByTestId('scenario-picker')).toBeTruthy();
    expect(screen.getByTestId('dot-plot')).toBeTruthy();
  });

  test('fetches scenarios from the backend on mount', async () => {
    await renderPage();
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/scenarios'),
      );
    });
  });

  test('filters out scenarios from other minitools when populating the picker', async () => {
    await renderPage();

    // Open the modal where saved DB scenarios are listed
    fireEvent.press(screen.getByText('Save / Load'));

    await waitFor(() => {
      expect(screen.getByText(dbScenario.name)).toBeTruthy();
    });
    expect(screen.queryByText(otherToolScenario.name)).toBeNull();
  });
});

describe('Minitool2Page — save flow', () => {
  test('alerts when the user tries to save without a name', async () => {
    await renderPage();

    fireEvent.press(screen.getByText('Save / Load'));
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Enter scenario name')).toBeTruthy(),
    );
    fireEvent.press(screen.getByText('Save Scenario'));

    expect(global.alert).toHaveBeenCalledWith(
      expect.stringMatching(/scenario name/i),
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('POSTs the scenario with toolType "minitool2" and refreshes the list', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, data: { _id: 'new-id' } },
    });

    await renderPage();

    fireEvent.press(screen.getByText('Save / Load'));
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Enter scenario name')).toBeTruthy(),
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('Enter scenario name'),
      'My Trial',
    );
    fireEvent.press(screen.getByText('Save Scenario'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    const [url, body] = axios.post.mock.calls[0];
    expect(url).toContain('/api/scenarios');
    expect(body).toMatchObject({
      name: 'My Trial',
      toolType: 'minitool2',
    });
    expect(body.data).toHaveProperty('dataBefore');
    expect(body.data).toHaveProperty('dataAfter');
  });
});

describe('Minitool2Page — delete flow', () => {
  test('calls DELETE /api/scenarios/:id when delete is pressed', async () => {
    axios.delete.mockResolvedValue({ data: { success: true } });

    await renderPage();

    fireEvent.press(screen.getByText('Save / Load'));
    await waitFor(() => screen.getByText(dbScenario.name));
    fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(1));
    expect(axios.delete.mock.calls[0][0]).toContain(
      `/api/scenarios/${dbScenario._id}`,
    );
  });
});

describe('Minitool2Page — upload modal', () => {
  test('opens the upload modal when the upload button is pressed', async () => {
    await renderPage();

    expect(screen.queryByTestId('upload-scenario-modal')).toBeNull();
    fireEvent.press(screen.getByText('Upload from File'));
    expect(screen.getByTestId('upload-scenario-modal')).toBeTruthy();
  });
});

describe('Minitool2Page — scenario switching', () => {
  test('changing the picker selection re-renders the dot plot with the new scenario', async () => {
    await renderPage();

    // Default chartName comes from the first preset.
    const picker = screen.getByTestId('scenario-picker');
    const initialLabel = picker.props.children.join('');

    fireEvent.press(picker);

    await waitFor(() => {
      const updated = screen.getByTestId('scenario-picker');
      expect(updated.props.children.join('')).not.toBe(initialLabel);
    });
  });
});
