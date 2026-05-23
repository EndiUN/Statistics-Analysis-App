import React from 'react';
import { View, Text, Switch, TextInput } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

import { GROUP_MODES, GROUP_MODE_OPTIONS } from '../lib/grouping';
import { dotPlotStyles as s, pickerSelectStyles } from './styles';

/**
 * Pure presentational controls for the DotPlot. All behaviour is delegated
 * to callbacks supplied by the parent (typically wired to useDotPlotTools).
 *
 * Note: the "Clear All Lines" action is intentionally rendered at the page
 * level (alongside Save/Load/Upload/Generate) so the four primary actions
 * stay grouped and visually consistent. This component only owns the
 * inline tool selectors.
 */
const DotPlotControls = React.memo(function DotPlotControls({ state, actions }) {
  return (
    <View style={s.controlsBox}>
      <Text style={s.controlsHeading}>Tools</Text>

      <View style={s.controlRow}>
        <Text style={s.controlLabel}>Groups</Text>
        <View style={s.controlField}>
          <RNPickerSelect
            onValueChange={(v) => v && actions.setGroupMode(v)}
            items={GROUP_MODE_OPTIONS}
            style={pickerSelectStyles}
            value={state.groupMode}
            placeholder={{}}
            useNativeAndroidPickerStyle={false}
          />
        </View>
      </View>

      {state.groupMode === GROUP_MODES.FIXED_INTERVAL && (
        <View style={s.controlRow}>
          <Text style={s.controlLabel}>Interval width</Text>
          <View style={s.controlField}>
            <TextInput
              style={s.numericInput}
              keyboardType="decimal-pad"
              value={state.intervalWidthInput}
              onChangeText={actions.setIntervalWidth}
            />
          </View>
        </View>
      )}

      {state.groupMode === GROUP_MODES.FIXED_GROUP_SIZE && (
        <View style={s.controlRow}>
          <Text style={s.controlLabel}>Per group</Text>
          <View style={s.controlField}>
            <TextInput
              style={s.numericInput}
              keyboardType="numeric"
              value={state.fixedGroupSizeInput}
              onChangeText={actions.setFixedGroupSize}
            />
          </View>
        </View>
      )}

      <View style={s.toggleRow}>
        <Text style={s.controlLabel}>Show Data</Text>
        <Switch
          value={state.showData}
          onValueChange={actions.setShowData}
          trackColor={{ true: '#2563eb' }}
        />
      </View>

      <View style={s.toggleRow}>
        <Text style={s.controlLabel}>Value tool</Text>
        <Switch
          value={state.valueToolEnabled}
          onValueChange={(v) => actions.setValueToolEnabled(v)}
          trackColor={{ true: '#2563eb' }}
        />
      </View>

      <View style={s.toggleRow}>
        <Text style={s.controlLabel}>Split Colors</Text>
        <Switch
          value={state.splitCharts}
          onValueChange={actions.setSplitCharts}
          trackColor={{ true: '#2563eb' }}
        />
      </View>
    </View>
  );
});

export default DotPlotControls;
