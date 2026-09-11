/// <reference types="node" />
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import {
  InsetGroupedList,
  InsetGroup,
  InsetRow,
} from '../../src/design-system/InsetGroupedList';
import { Colors, Radii, Layout } from '../../src/design-system/tokens';
// @ts-ignore
import { hapticsHistory } from '../mocks/expo-haptics.cjs';
// @ts-ignore
import { Pressable } from '../mocks/react-native.cjs';

describe('InsetGroupedList — Boundary Values & Edge Cases (0, 1, 50 rows)', () => {
  beforeEach(() => {
    hapticsHistory.length = 0;
  });

  test('Edge Case 1: InsetGroup with 0 rows (empty group)', () => {
    // Empty children
    const emptyGroup = React.createElement(
      InsetGroup,
      { header: 'Grupo Vazio', footer: 'Rodapé de grupo vazio', children: [] },
      []
    );

    assert.ok(React.isValidElement(emptyGroup));
    const rendered = InsetGroup({
      header: 'Grupo Vazio',
      footer: 'Rodapé de grupo vazio',
      children: [],
    });

    assert.ok(rendered !== null);
    // Header should exist
    const headerNode = rendered.props.children[0];
    assert.strictEqual(headerNode.props.children, 'Grupo Vazio');

    // GroupCard should be empty but exist
    const cardNode = rendered.props.children[1];
    assert.ok(cardNode !== null);

    // Footer should exist
    const footerNode = rendered.props.children[2];
    assert.strictEqual(footerNode.props.children, 'Rodapé de grupo vazio');
  });

  test('Edge Case 2: InsetGroup with exactly 1 row (single item)', () => {
    let pressed = false;
    const singleRow = React.createElement(InsetRow, {
      label: 'Paciente Exclusivo',
      value: 'Ativo',
      onPress: () => {
        pressed = true;
      },
    });

    const renderedGroup = InsetGroup({
      header: 'Paciente Único',
      children: singleRow,
    });

    const cardNode = renderedGroup.props.children[1];
    const mappedChildren = cardNode.props.children;
    const clonedRow = Array.isArray(mappedChildren) ? mappedChildren[0] : mappedChildren;

    assert.ok(clonedRow !== null);
    assert.strictEqual(
      clonedRow.props.isFirst,
      true,
      'Single row must be marked isFirst=true'
    );
    assert.strictEqual(
      clonedRow.props.isLast,
      true,
      'Single row must be marked isLast=true'
    );

    // Render the InsetRow itself with isFirst=true, isLast=true
    const renderedRow = InsetRow({
      label: 'Paciente Exclusivo',
      value: 'Ativo',
      isFirst: true,
      isLast: true,
      onPress: () => {
        pressed = true;
      },
    });

    // Outer pressable container
    assert.strictEqual(
      renderedRow.type,
      Pressable,
      'Row with onPress must render Pressable root'
    );

    // Trigger press
    renderedRow.props.onPress();
    assert.strictEqual(pressed, true);
    assert.strictEqual(hapticsHistory[0].type, 'selection');

    // Inspect content container inside Pressable
    const content = renderedRow.props.children;
    const containerStyle = content.props.style;
    const cornerStyle = containerStyle[1];

    assert.strictEqual(
      cornerStyle.borderRadius,
      Radii.card,
      'Single row must have squircle card radius (14pt) on all 4 corners'
    );

    // Verify separator is NOT rendered (index 5 is null/undefined when isLast=true)
    const separatorSlot = content.props.children[5];
    assert.strictEqual(
      separatorSlot,
      null,
      'Hairline separator must NOT be rendered on single (isLast) row'
    );
  });

  test('Edge Case 3: InsetGroup with 50 rows (large stress-test dataset)', () => {
    const rowCount = 50;
    const rows = Array.from({ length: rowCount }, (_, i) =>
      React.createElement(InsetRow, {
        key: `row-${i}`,
        label: `Paciente ${i + 1}`,
        value: `Sessão ${i + 1}`,
        icon: i % 2 === 0 ? 'person' : undefined,
        onPress: () => {},
      })
    );

    const renderedGroup = InsetGroup({
      header: '50 Pacientes Stress Test',
      children: rows,
    });

    const cardNode = renderedGroup.props.children[1];
    const mappedRows = cardNode.props.children;

    assert.strictEqual(
      mappedRows.length,
      50,
      'Group must successfully map all 50 rows'
    );

    // Row 0 (First row): isFirst=true, isLast=false
    const firstRowProps = mappedRows[0].props;
    assert.strictEqual(firstRowProps.isFirst, true);
    assert.strictEqual(firstRowProps.isLast, false);

    // Row 25 (Middle row without icon: i=25, 25 % 2 !== 0): isFirst=false, isLast=false
    const middleRowWithoutIconProps = mappedRows[25].props;
    assert.strictEqual(middleRowWithoutIconProps.isFirst, false);
    assert.strictEqual(middleRowWithoutIconProps.isLast, false);

    // Row 49 (Last row): isFirst=false, isLast=true
    const lastRowProps = mappedRows[49].props;
    assert.strictEqual(lastRowProps.isFirst, false);
    assert.strictEqual(lastRowProps.isLast, true);

    // Now render Row 0, Row 25, Row 49 to check corner and separator invariants
    const firstRendered = InsetRow(firstRowProps);
    const firstContent = firstRendered.props.children;
    const firstCorners = firstContent.props.style[1];
    assert.strictEqual(firstCorners.borderTopLeftRadius, Radii.card);
    assert.strictEqual(firstCorners.borderTopRightRadius, Radii.card);
    assert.strictEqual(firstCorners.borderBottomLeftRadius, undefined);
    // Row 0 has icon -> separator left indent must be 58pt
    const firstSeparator = firstContent.props.children[5];
    assert.ok(firstSeparator !== null, 'First row must render separator');
    assert.strictEqual(
      firstSeparator.props.style[1].left,
      Layout.separatorIndentWithIcon,
      'Separator with icon must indent 58pt'
    );

    // Middle row (Row 25 has no icon -> separator left indent must be 16pt)
    const middleRendered = InsetRow(middleRowWithoutIconProps);
    const middleContent = middleRendered.props.children;
    const middleCorners = middleContent.props.style[1];
    assert.strictEqual(Object.keys(middleCorners).length, 0, 'Middle row must have no corner radii');
    const middleSeparator = middleContent.props.children[5];
    assert.ok(middleSeparator !== null, 'Middle row must render separator');
    assert.strictEqual(
      middleSeparator.props.style[1].left,
      Layout.separatorIndentWithoutIcon,
      'Separator without icon must indent 16pt'
    );

    // Last row (Row 49): bottom corners rounded, no separator
    const lastRendered = InsetRow(lastRowProps);
    const lastContent = lastRendered.props.children;
    const lastCorners = lastContent.props.style[1];
    assert.strictEqual(lastCorners.borderBottomLeftRadius, Radii.card);
    assert.strictEqual(lastCorners.borderBottomRightRadius, Radii.card);
    assert.strictEqual(lastCorners.borderTopLeftRadius, undefined);
    assert.strictEqual(lastContent.props.children[5], null, 'Last row must NOT render separator');
  });

  test('Edge Case 4: Destructive InsetRow styling and warning haptics', () => {
    let deleted = false;
    const rendered = InsetRow({
      label: 'Excluir Prontuário',
      destructive: true,
      onPress: () => {
        deleted = true;
      },
    });

    rendered.props.onPress();
    assert.strictEqual(deleted, true);
    assert.strictEqual(
      hapticsHistory[0].value,
      'warning',
      'Destructive action must trigger warning haptics'
    );

    const content = rendered.props.children;
    const labelWrapper = content.props.children[1];
    const labelText = labelWrapper.props.children[0];

    // Destructive text style should apply destructive color
    const labelStyles = labelText.props.style;
    const destructiveStyle = labelStyles[1];
    assert.strictEqual(destructiveStyle.color, Colors.destructive);
  });

  test('Edge Case 5: Falsy and null children in InsetGroup handled safely', () => {
    const renderedGroup = InsetGroup({
      children: [
        React.createElement(InsetRow, { key: '1', label: 'Item 1' }),
        null,
        undefined,
        false,
        React.createElement(InsetRow, { key: '2', label: 'Item 2' }),
      ],
    });

    const cardNode = renderedGroup.props.children[1];
    const mappedChildren = cardNode.props.children;
    // Falsy items should be passed through safely or filtered
    assert.ok(mappedChildren !== null);
  });

  test('Edge Case 6: Conditional leading child correctly assigns isFirst and isLast to rendered rows', () => {
    const showHeaderItem = false;
    const renderedGroup = InsetGroup({
      children: [
        showHeaderItem && React.createElement(InsetRow, { key: 'row0', label: 'Item 0' }),
        React.createElement(InsetRow, { key: 'row1', label: 'Item 1' }),
        React.createElement(InsetRow, { key: 'row2', label: 'Item 2' }),
      ],
    });

    const cardNode = renderedGroup.props.children[1];
    const mappedChildren = cardNode.props.children;
    assert.strictEqual(mappedChildren.length, 2);
    assert.strictEqual(mappedChildren[0].props.isFirst, true, 'First visible row must have isFirst=true');
    assert.strictEqual(mappedChildren[0].props.isLast, false, 'First visible row must have isLast=false');
    assert.strictEqual(mappedChildren[1].props.isFirst, false, 'Last visible row must have isFirst=false');
    assert.strictEqual(mappedChildren[1].props.isLast, true, 'Last visible row must have isLast=true');
  });
});
