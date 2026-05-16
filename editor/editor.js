// Noise Graph Editor

// -----------------------------------------------------------------------------
// Globals and editor state
// -----------------------------------------------------------------------------

const TITLE = 'Noise Graph';
const INTERACTION_HISTORY_DEBOUNCE_MS = 250;
const POINTERUP_HISTORY_QUIET_PERIOD_MS = 120;

const editorState = {
  dirty: false,
  graphLoaded: false,
  graphName: '',
  graphBuilder: null,
  graphBuilderApi: null,
  selectedNodeId: null,
  contextNodeId: null,
  canvasSize: { x: 0, y: 0 },
  mousePosition: { x: 0, y: 0 },
  clipboard: null,
  contextMenuPosition: { x: 0, y: 0 },
  suspendHistory: false,
  pendingInteractionHistoryAction: null,
  isPointerInteractionActive: false,
  savedHistoryIndex: -1,
  history: {
    snapshots: [],
    currentIndex: -1,
  },
  settings: {
    theme: 'dark',
    showGrid: true,
    snapToGrid: false,
  },
  transport: {
    playing: false,
    active: false,
    animationFrameId: null,
  },
};

let NO_GRAPH_MESSAGE = null;

const DARK_MODE_GRAPH_THEME = {
  // Background
  backgroundColor: '#333',

  // Grid
  gridDotColor: '#fff1',
  gridDotLineWidth: 2,

  // Node frame
  nodeFillColor: '#fff2',
  nodeSelectedFillColor: '#fff5',
  nodeBorderColor: '#fff5',
  nodeHoveredBorderColor: '#fff8',
  nodeBorderWidth: 2,
  nodeBorderRadius: 10,
  nodePadding: 5,

  // Node label
  showNodeLabel: true,
  nodeLabelColor: '#fffb',
  nodeLabelFont: 'bold 12px sans-serif',

  // Delete button
  deleteButtonColor: '#fff5',
  deleteButtonHoveredColor: '#fff8',
  deleteButtonLineWidth: 2,

  // Resize handle
  resizeHandleColor: '#fff2',
  resizeHandleHoveredColor: '#fff5',
  resizeHandleLineWidth: 2,

  // Port
  portRadius: 8,
  portCutoutRadius: 12,
  portFillColor: '#fff2',
  portHoveredFillColor: '#fff4',
  portInvalidFillColor: '#ff334433',
  portBorderColor: '#fff5',
  portHoveredBorderColor: '#fff8',
  portInvalidBorderColor: '#ff6677',
  portBorderWidth: 2,
  portHoverRingColor: '#fff2',
  portInvalidRingColor: '#ff445588',
  portHoverRingLineWidth: 6,
  portHoverRingRadius: 12,
  showPortArrows: false,
  portArrowSize: 6,
  portArrowColor: '#fff5',
  portArrowOffset: 0.44,
  portPulseColor: '#66ccff',
  portPulseLineWidth: 2,
  portPulseFromRadius: 10,
  portPulseToRadius: 30,
  portPulseMaxOpacity: 0.8,

  // Port label
  showPortLabel: true,
  portLabelOffset: 8,
  portLabelColor: '#fffb',
  portLabelFont: '10px sans-serif',

  // Edge
  edgeColor: '#fff2',
  edgeHoveredColor: '#fff4',
  edgeLineWidth: 3,
  edgeHoverOutlineColor: '#fff2',
  edgeHoverOutlineLineWidth: 10,
  showEdgeArrows: false,
  edgeArrowSize: 8,
  edgeArrowColor: '#fff5',
  edgeArrowOffset: 0.5,

  // Edge preview
  edgePreviewColor: '#fff6',
  edgePreviewLineWidth: 3,
  edgePreviewOutlineColor: '#fff3',
  edgePreviewOutlineLineWidth: 10,
  edgeDashColor: '#7dd3fc',
  edgeDashLineWidth: 3,
  edgeDotColor: '#fde047',
  edgeDotRadius: 4,
  edgeDotOpacity: 1,
};

const LIGHT_MODE_GRAPH_THEME = {
  // Background
  backgroundColor: '#fff',

  // Grid
  gridDotColor: '#0001',
  gridDotLineWidth: 2,

  // Node frame
  nodeFillColor: '#0002',
  nodeSelectedFillColor: '#0005',
  nodeBorderColor: '#0005',
  nodeHoveredBorderColor: '#0008',
  nodeBorderWidth: 2,
  nodeBorderRadius: 10,
  nodePadding: 5,

  // Node label
  showNodeLabel: true,
  nodeLabelColor: '#000b',
  nodeLabelFont: 'bold 12px sans-serif',

  // Delete button
  deleteButtonColor: '#0005',
  deleteButtonHoveredColor: '#0008',
  deleteButtonLineWidth: 2,

  // Resize handle
  resizeHandleColor: '#0002',
  resizeHandleHoveredColor: '#0005',
  resizeHandleLineWidth: 2,

  // Port
  portRadius: 8,
  portCutoutRadius: 12,
  portFillColor: '#0002',
  portHoveredFillColor: '#0004',
  portInvalidFillColor: '#ff334433',
  portBorderColor: '#0005',
  portHoveredBorderColor: '#0008',
  portInvalidBorderColor: '#ff6677',
  portBorderWidth: 2,
  portHoverRingColor: '#0002',
  portInvalidRingColor: '#ff445588',
  portHoverRingLineWidth: 6,
  portHoverRingRadius: 12,
  showPortArrows: false,
  portArrowSize: 6,
  portArrowColor: '#0005',
  portArrowOffset: 0.44,
  portPulseColor: '#66ccff',
  portPulseLineWidth: 2,
  portPulseFromRadius: 10,
  portPulseToRadius: 30,
  portPulseMaxOpacity: 0.8,

  // Port label
  showPortLabel: true,
  portLabelOffset: 8,
  portLabelColor: '#000b',
  portLabelFont: '10px sans-serif',

  // Edge
  edgeColor: '#0002',
  edgeHoveredColor: '#0004',
  edgeLineWidth: 3,
  edgeHoverOutlineColor: '#0002',
  edgeHoverOutlineLineWidth: 10,
  showEdgeArrows: false,
  edgeArrowSize: 8,
  edgeArrowColor: '#0005',
  edgeArrowOffset: 0.5,

  // Edge preview
  edgePreviewColor: '#0006',
  edgePreviewLineWidth: 3,
  edgePreviewOutlineColor: '#0003',
  edgePreviewOutlineLineWidth: 10,
  edgeDashColor: '#7dd3fc',
  edgeDashLineWidth: 3,
  edgeDotColor: '#fde047',
  edgeDotRadius: 4,
  edgeDotOpacity: 1,
};

const NUMBER_SCHEMA = {
  type: 'number',
};

const VECTOR_SCHEMA = {
  type: 'object',
  properties: {
    x: NUMBER_SCHEMA,
    y: NUMBER_SCHEMA,
    z: NUMBER_SCHEMA,
    w: NUMBER_SCHEMA,
  },
  required: ['x', 'y', 'z', 'w'],
};

const NUMBER_PORT_THEME = {
  theme: {
    portFillColor: 'rgba(0, 140, 255, 0.2)',
    portHoveredFillColor: 'rgba(0, 140, 255, 0.4)',
    portBorderColor: 'rgba(0, 140, 255, 0.4)',
    portHoveredBorderColor: 'rgba(0, 140, 255, 0.8)',
  },
  edgeTheme: {
    edgeColor: 'rgba(0, 140, 255, 0.4)',
    edgeHoveredColor: 'rgba(0, 140, 255, 0.7)',
    edgeArrowColor: 'rgba(0, 140, 255, 0.6)',
  },
};

const VECTOR_PORT_THEME = {
  theme: {
    portFillColor: 'rgba(255, 140, 0, 0.2)',
    portHoveredFillColor: 'rgba(255, 140, 0, 0.4)',
    portBorderColor: 'rgba(255, 140, 0, 0.4)',
    portHoveredBorderColor: 'rgba(255, 140, 0, 0.8)',
  },
  edgeTheme: {
    edgeColor: 'rgba(255, 140, 0, 0.4)',
    edgeHoveredColor: 'rgba(255, 140, 0, 0.7)',
    edgeArrowColor: 'rgba(255, 140, 0, 0.6)',
  },
};

const INITIAL_NODE_TEMPLATE = 'constant-number';

const NODE_TYPES = {
  'constant-number': {
    template: {
      label: 'Constant Number',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'value',
          label: 'Value',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'constant-number',
        value: 0,
        configuration: {
          value: 0,
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        value: NUMBER_SCHEMA,
      },
      required: ['value'],
    },
    f: (node) => {
      return {
        value: node.data.configuration.value,
      };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(0, 140, 255, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 4)}px sans-serif`;
      context.fillText(
        `${node.data.configuration.value.toFixed(2)}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'constant-vector': {
    template: {
      label: 'Constant Vector',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'value',
          label: 'Value',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'constant-vector',
        value: { x: 0, y: 0, z: 0, w: 0 },
        configuration: {
          value: { x: 0, y: 0, z: 0, w: 0 },
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        value: VECTOR_SCHEMA,
      },
      required: ['value'],
    },
    f: (node) => {
      return {
        value: node.data.configuration.value,
      };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(255, 140, 0, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 6)}px sans-serif`;
      context.fillText(
        `${JSON.stringify(Object.values(node.data.configuration.value))}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'input-parameter-number': {
    template: {
      label: 'Input Parameter Number',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'value',
          label: 'Value',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'input-parameter-number',
        value: 0,
        configuration: {
          key: '',
          value: 0,
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: NUMBER_SCHEMA,
      },
      required: ['value'],
    },
    f: (node) => {
      return {
        value: node.data.configuration.value,
      };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(0, 140, 255, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 4)}px sans-serif`;
      context.fillText(
        `${node.data.configuration.value.toFixed(2)}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'input-parameter-vector': {
    template: {
      label: 'Input Parameter Vector',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'value',
          label: 'Value',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'input-parameter-vector',
        value: { x: 0, y: 0, z: 0, w: 0 },
        configuration: {
          key: '',
          value: { x: 0, y: 0, z: 0, w: 0 },
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: VECTOR_SCHEMA,
      },
      required: ['key', 'value'],
    },
    f: (node) => {
      return {
        value: node.data.configuration.value,
      };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(255, 140, 0, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 6)}px sans-serif`;
      context.fillText(
        `${JSON.stringify(Object.values(node.data.configuration.value))}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'output-parameter-number': {
    template: {
      label: 'Output Parameter Number',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'value',
          label: 'Value',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'output-parameter-number',
        value: 0,
      },
    },
    f: (node, inputs) => {
      return {
        value: inputs.value ?? 0,
      };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(0, 140, 255, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 4)}px sans-serif`;
      context.fillText(
        `${node.data.value.toFixed(2)}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'output-parameter-vector': {
    template: {
      label: 'Output Parameter Vector',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'value',
          label: 'Value',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'output-parameter-vector',
        value: { x: 0, y: 0, z: 0, w: 0 },
      },
    },
    f: (node, inputs) => {
      return {
        value: inputs.value ?? { x: 0, y: 0, z: 0, w: 0 },
      };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(255, 140, 0, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 6)}px sans-serif`;
      context.fillText(
        `${JSON.stringify(Object.values(node.data.value))}`,

        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'clamp': {
    template: {
      label: 'Clamp',
      size: { x: 200, y: 200 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'min',
          label: 'Min',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'max',
          label: 'Max',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'clamp',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: clamp(inputs.input ?? 0, inputs.min ?? 0, inputs.max ?? 0),
      };
    },
  },
  'lerp': {
    template: {
      label: 'Lerp',
      size: { x: 200, y: 200 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 't',
          label: 'T',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'lerp',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: lerp(inputs.a ?? 0, inputs.b ?? 0, inputs.t ?? 0),
      };
    },
  },
  'remap': {
    template: {
      label: 'Remap',
      size: { x: 200, y: 300 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'a1',
          label: 'A1',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'a2',
          label: 'A2',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b1',
          label: 'B1',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b2',
          label: 'B2',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'remap',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: remap(
          inputs.input ?? 0,
          inputs.a1 ?? 0,
          inputs.a2 ?? 0,
          inputs.b1 ?? 0,
          inputs.b2 ?? 0
        ),
      };
    },
  },
  'threshold': {
    template: {
      label: 'Threshold',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'compare',
          label: 'Compare',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'threshold',
        output: 0,
        configuration: {
          comparator: '>',
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        comparator: {
          type: 'string',
          enum: ['>', '>=', '<', '<=', '==', '!='],
        },
      },
    },
    f: (node, inputs) => {
      const { comparator } = node.data.configuration;
      const input = inputs.input ?? 0;
      const compare = inputs.compare ?? 0;
      let result;
      switch (comparator) {
        case '>':
          result = input > compare ? 1 : 0; break;
        case '>=':
          result = input >= compare ? 1 : 0; break;
        case '<':
          result = input < compare ? 1 : 0; break;
        case '<=':
          result = input <= compare ? 1 : 0; break;
        case '==':
          result = input == compare ? 1 : 0; break;
        case '!=':
          result = input != compare ? 1 : 0; break;
        default:
          result = 0;
      }
      return { output: result };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(0, 140, 255, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 4)}px sans-serif`;
      context.fillText(
        `${node.data.configuration.comparator}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'gate-number': {
    template: {
      label: 'Gate Number',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'control',
          label: 'Control',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'gate-number',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.control ?? 0) > 0 ? (inputs.input ?? 0) : 0,
      };
    },
  },
  'gate-vector': {
    template: {
      label: 'Gate Vector',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'control',
          label: 'Control',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'gate-vector',
        output: { x: 0, y: 0, z: 0, w: 0 },
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.control ?? 0) > 0
          ? (inputs.input ?? { x: 0, y: 0, z: 0, w: 0 })
          : { x: 0, y: 0, z: 0, w: 0 },
      };
    },
  },
  'band': {
    template: {
      label: 'Band',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'bands',
          label: 'Bands',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'band',
        output: 0,
      },
    },
    f: (node, inputs) => {
      const bands = Math.round(inputs.bands ?? 0);
      if (bands <= 0) return { output: 0 };
      const input = inputs.input ?? 0;
      const step = 1 / bands;
      return { output: Math.round(input / step) * step };
    },
  },
  'switch': {
    template: {
      label: 'Switch',
      size: { x: 200, y: 250 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output1',
          label: 'Output 1',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output2',
          label: 'Output 2',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output3',
          label: 'Output 3',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output4',
          label: 'Output 4',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'switch',
        output1: 0,
        output2: 0,
        output3: 0,
        output4: 0,
      },
    },
    f: (node, inputs) => {
      const input = Math.round(inputs.input ?? 0);
      return {
        output1: input === 1 ? 1 : 0,
        output2: input === 2 ? 1 : 0,
        output3: input === 3 ? 1 : 0,
        output4: input === 4 ? 1 : 0,
      };
    },
  },
  'buffer': {
    template: {
      label: 'Buffer',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'buffer',
        output: 0,
        buffer: [],
        writeIndex: 0,
        readIndex: 0,
        filledCount: 0,
        loopIndex: 0,
        phase: 'recording',
        configuration: {
          length: 16,
          mode: 'delay',
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        length: {
          type: 'number',
        },
        mode: {
          type: 'string',
          enum: ['delay', 'capture-loop'],
        },
      },
      required: ['length', 'mode'],
    },
    f: (node, inputs) => {
      const length = Math.max(1, Math.floor(node.data.configuration.length));
      const mode = node.data.configuration.mode;
      const input = inputs.input ?? 0;

      if (!node.data.buffer || node.data.buffer.length !== length) {
        node.data.buffer = new Array(length).fill(0);
        node.data.writeIndex = 0;
        node.data.readIndex = 0;
        node.data.filledCount = 0;
        node.data.phase = 'recording';
      }

      if (mode === 'delay') {
        const output = node.data.buffer[node.data.readIndex] ?? 0;
        node.data.buffer[node.data.writeIndex] = input;
        node.data.writeIndex = (node.data.writeIndex + 1) % length;
        node.data.readIndex = (node.data.readIndex + 1) % length;
        return { output };
      } else if (mode === 'capture-loop') {
        if (node.data.phase === 'recording') {
          node.data.buffer[node.data.writeIndex] = input;
          node.data.writeIndex = (node.data.writeIndex + 1) % length;
          if (node.data.filledCount < length) {
            node.data.filledCount++;
          }
          if (node.data.filledCount === length) {
            node.data.phase = 'playing';
          }
          return { output: 0 };
        } else {
          const output = node.data.buffer[node.data.readIndex] ?? 0;
          node.data.readIndex = (node.data.readIndex + 1) % length;
          return { output };
        }
      } else {
        return { output: 0 };
      }
    },
    draw: (node, context, position, size) => {
      drawChart(context, {
        type: 'area',
        position: {
          x: position.x + 20,
          y: position.y + 20,
        },
        size: {
          x: size.x - 40,
          y: size.y - 40,
        },
        series: [
          { data: node.data.buffer },
        ],
        xAxis: {
          show: false,
          grid: false,
        },
        yAxis: {
          show: false,
          grid: false,
        },
      });
    },
  },
  'vectorize': {
    template: {
      label: 'Vectorize',
      size: { x: 200, y: 250 },
      ports: [
        {
          id: 'x',
          label: 'X',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'y',
          label: 'Y',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'z',
          label: 'Z',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'w',
          label: 'W',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'vectorize',
        output: { x: 0, y: 0, z: 0, w: 0 },
      },
    },
    f: (node, inputs) => {
      return {
        output: {
          x: inputs.x ?? 0,
          y: inputs.y ?? 0,
          z: inputs.z ?? 0,
          w: inputs.w ?? 0,
        },
      };
    },
  },
  'components': {
    template: {
      label: 'Components',
      size: { x: 200, y: 250 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'x',
          label: 'X',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
        {
          id: 'y',
          label: 'Y',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
        {
          id: 'z',
          label: 'Z',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
        {
          id: 'w',
          label: 'W',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'components',
        x: 0,
        y: 0,
        z: 0,
        w: 0,
      },
    },
    f: (node, inputs) => {
      const input = inputs.input ?? { x: 0, y: 0, z: 0, w: 0 };
      return {
        x: input.x,
        y: input.y,
        z: input.z,
        w: input.w,
      };
    },
  },
  'swizzle': {
    template: {
      label: 'Swizzle',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'swizzle',
        output: { x: 0, y: 0, z: 0, w: 0 },
        configuration: {
          pattern: 'xyzw',
        },
      },
    },
    f: (node, inputs) => {
      const pattern = node.data.configuration.pattern;
      const input = inputs.input ?? { x: 0, y: 0, z: 0, w: 0 };
      const output = { x: 0, y: 0, z: 0, w: 0 };
      for (let i = 0; i < 4; i++) {
        const char = pattern[i] || 'x';
        output[['x', 'y', 'z', 'w'][i]] = input[char] ?? 0;
      }
      return { output };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(255, 140, 0, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 6)}px sans-serif`;
      context.fillText(
        `${node.data.configuration.pattern}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'normalize': {
    template: {
      label: 'Normalize',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'normalize',
        output: 0,
      },
    },
    f: (node, inputs) => {
      const input = inputs.input ?? { x: 0, y: 0, z: 0, w: 0 };
      const length = Math.sqrt(
        input.x * input.x +
        input.y * input.y +
        input.z * input.z +
        input.w * input.w
      );
      const output = length > 0
        ? {
            x: input.x / length,
            y: input.y / length,
            z: input.z / length,
            w: input.w / length
          }
        : { x: 0, y: 0, z: 0, w: 0 };
      return { output };
    },
  },
  'dot-product': {
    template: {
      label: 'Dot Product',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'dot-product',
        output: 0,
      },
    },
    f: (node, inputs) => {
      const input = inputs.input ?? { x: 0, y: 0, z: 0, w: 0 };
      const output =
        input.x * input.x +
        input.y * input.y +
        input.z * input.z +
        input.w * input.w;
      return { output };
    },
  },
  'cross-product': {
    template: {
      label: 'Cross Product',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'cross-product',
        output: { x: 0, y: 0, z: 0, w: 0 },
      },
    },
    f: (node, inputs) => {
      const a = inputs.a ?? { x: 0, y: 0, z: 0, w: 0 };
      const b = inputs.b ?? { x: 0, y: 0, z: 0, w: 0 };
      const output = {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
        w: 0,
      };
      return { output };
    },
  },
  'offset': {
    template: {
      label: 'Offset',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'offset',
          label: 'Offset',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'offset',
        output: { x: 0, y: 0, z: 0, w: 0 },
      },
    },
    f: (node, inputs) => {
      const input = inputs.input ?? { x: 0, y: 0, z: 0, w: 0 };
      const offset = inputs.offset ?? { x: 0, y: 0, z: 0, w: 0 };
      const output = {
        x: input.x + offset.x,
        y: input.y + offset.y,
        z: input.z + offset.z,
        w: input.w + offset.w,
      };
      return { output };
    },
  },
  'scale': {
    template: {
      label: 'Scale',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'scale',
          label: 'Scale',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'scale',
        output: { x: 0, y: 0, z: 0, w: 0 },
      },
    },
    f: (node, inputs) => {
      const input = inputs.input ?? { x: 0, y: 0, z: 0, w: 0 };
      const scale = inputs.scale ?? 1;
      const output = {
        x: input.x * scale,
        y: input.y * scale,
        z: input.z * scale,
        w: input.w * scale,
      };
      return { output };
    },
  },
  'add': {
    template: {
      label: 'Add',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'add',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.a ?? 0) + (inputs.b ?? 0),
      };
    },
  },
  'subtract': {
    template: {
      label: 'Subtract',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'subtract',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.a ?? 0) - (inputs.b ?? 0),
      };
    },
  },
  'multiply': {
    template: {
      label: 'Multiply',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'multiply',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.a ?? 0) * (inputs.b ?? 0),
      };
    },
  },
  'divide': {
    template: {
      label: 'Divide',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'divide',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.a ?? 0) / (inputs.b ?? 1),
      };
    },
  },
  'modulo': {
    template: {
      label: 'Modulo',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'modulo',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: (inputs.a ?? 0) % (inputs.b ?? 1),
      };
    },
  },
  'power': {
    template: {
      label: 'Power',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'a',
          label: 'A',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'b',
          label: 'B',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'power',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.pow(inputs.a ?? 0, inputs.b ?? 0),
      };
    },
  },
  'absolute': {
    template: {
      label: 'Absolute',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'absolute',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.abs(inputs.input ?? 0),
      };
    },
  },
  'floor': {
    template: {
      label: 'Floor',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'floor',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.floor(inputs.input ?? 0),
      };
    },
  },
  'ceiling': {
    template: {
      label: 'Ceiling',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'ceiling',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.ceil(inputs.input ?? 0),
      };
    },
  },
  'sine': {
    template: {
      label: 'Sine',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'sine',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.sin(inputs.input ?? 0),
      };
    },
  },
  'cosine': {
    template: {
      label: 'Cosine',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'cosine',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.cos(inputs.input ?? 0),
      };
    },
  },
  'tangent': {
    template: {
      label: 'Tangent',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'tangent',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.tan(inputs.input ?? 0),
      };
    },
  },
  'atan2': {
    template: {
      label: 'Atan2',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'y',
          label: 'Y',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'x',
          label: 'X',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'atan2',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.atan2(inputs.y ?? 0, inputs.x ?? 1),
      };
    },
  },
  'time': {
    template: {
      label: 'Time',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'time',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Date.now() / 1000,
      };
    },
  },
  'tick': {
    template: {
      label: 'Tick',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'tick',
        output: 0,
        tickCount: 0,
      },
    },
    f: (node, inputs) => {
      node.data.tickCount = (node.data.tickCount || 0) + 1;
      return {
        output: node.data.tickCount,
      };
    },
  },
  'random': {
    template: {
      label: 'Random',
      size: { x: 200, y: 100 },
      ports: [
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'random',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: Math.random(),
      };
    },
  },
  'perlin': {
    template: {
      label: 'Perlin',
      size: { x: 200, y: 250 },
      ports: [
        {
          id: 'seed',
          label: 'Seed',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'x',
          label: 'X',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'y',
          label: 'Y',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'z',
          label: 'Z',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'perlin',
        output: 0,
        noise: null,
      },
    },
    f: (node, inputs) => {
      if (!node.data.noise?.perlin3) {
        node.data.noise = new Noise(inputs.seed ?? 0);
      }
      return {
        output: node.data.noise.perlin3(
          inputs.x ?? 0,
          inputs.y ?? 0,
          inputs.z ?? 0
        ),
      };
    },
  },
  'fractal-perlin': {
    template: {
      label: 'Fractal Perlin',
      size: { x: 200, y: 400 },
      ports: [
        {
          id: 'seed',
          label: 'Seed',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'x',
          label: 'X',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'y',
          label: 'Y',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'z',
          label: 'Z',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'octaves',
          label: 'Octaves',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'persistence',
          label: 'Persistence',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'lacunarity',
          label: 'Lacunarity',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'fractal-perlin',
        output: 0,
        noise: null,
      },
    },
    f: (node, inputs) => {
      if (!node.data.noise?.perlin3) {
        node.data.noise = new Noise(inputs.seed ?? 0);
      }
      const octaves = Math.max(1, Math.floor(inputs.octaves ?? 1));
      let amplitude = 1;
      let frequency = 1;
      let output = 0;
      const persistence = inputs.persistence ?? 0.5;
      const lacunarity = inputs.lacunarity ?? 2;
      for (let i = 0; i < octaves; i++) {
        output +=
          amplitude *
          node.data.noise.perlin3(
            (inputs.x ?? 0) * frequency,
            (inputs.y ?? 0) * frequency,
            (inputs.z ?? 0) * frequency
          );
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      return { output };
    },
  },
  'square-wave': {
    template: {
      label: 'Square Wave',
      size: { x: 200, y: 200 },
      ports: [
        {
          id: 'frequency',
          label: 'Frequency',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'amplitude',
          label: 'Amplitude',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'dutyCycle',
          label: 'Duty Cycle',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'square-wave',
        output: 0,
      },
    },
    f: (node, inputs) => {
      const frequency = inputs.frequency ?? 1;
      const amplitude = inputs.amplitude ?? 1;
      const dutyCycle = clamp(inputs.dutyCycle ?? 0.5, 0, 1);
      const time = Date.now() / 1000;
      const phase = ((time * frequency) % 1 + 1) % 1;
      return {
        output: phase < dutyCycle ? amplitude : -amplitude,
      };
    },
  },
  'triangle-wave': {
    template: {
      label: 'Triangle Wave',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'frequency',
          label: 'Frequency',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'amplitude',
          label: 'Amplitude',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'triangle-wave',
        output: 0,
      },
    },
    f: (node, inputs) => {
      const frequency = inputs.frequency ?? 1;
      const amplitude = inputs.amplitude ?? 1;
      const time = Date.now() / 1000;
      const phase = ((time * frequency) % 1 + 1) % 1;
      return {
        output: amplitude * (1 - 4 * Math.abs(phase - 0.5)),
      };
    },
  },
  'sawtooth-wave': {
    template: {
      label: 'Sawtooth Wave',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'frequency',
          label: 'Frequency',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'amplitude',
          label: 'Amplitude',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'sawtooth-wave',
        output: 0,
      },
    },
    f: (node, inputs) => {
      const frequency = inputs.frequency ?? 1;
      const amplitude = inputs.amplitude ?? 1;
      const time = Date.now() / 1000;
      const phase = ((time * frequency) % 1 + 1) % 1;
      return {
        output: amplitude * (2 * phase - 1),
      };
    },
  },
  'sequence': {
    template: {
      label: 'Sequence',
      size: { x: 200, y: 150 },
      ports: [
        {
          id: 'rate',
          label: 'Rate',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'sequence',
        output: 0,
        sequenceIndex: 0,
        sequenceTick: 0,
        configuration: {
          sequence: '0,1,2,3',
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        sequence: {
          type: 'string',
        },
      },
      required: ['sequence'],
    },
    f: (node, inputs) => {
      const sequenceText = node.data.configuration.sequence ?? '';
      const sequence = sequenceText
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isFinite(value));

      if (sequence.length === 0) {
        return { output: 0 };
      }

      const rate = Math.max(1, Math.round(inputs.rate ?? 1));
      const index = node.data.sequenceIndex % sequence.length;
      const output = sequence[index] ?? 0;

      node.data.sequenceTick = (node.data.sequenceTick ?? 0) + 1;
      if (node.data.sequenceTick >= rate) {
        node.data.sequenceTick = 0;
        node.data.sequenceIndex = (index + 1) % sequence.length;
      } else {
        node.data.sequenceIndex = index;
      }

      return { output };
    },
    draw: (node, context, position, size) => {
      context.save();
      context.fillStyle = 'rgba(0, 140, 255, 0.7)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 5)}px sans-serif`;
      context.fillText(
        `${(node.data.output ?? 0).toFixed(2)}`,
        position.x + size.x / 2,
        position.y + size.y / 2
      );
      context.restore();
    },
  },
  'dial': {
    template: {
      label: 'Dial',
      size: { x: 200, y: 200 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'dial',
        output: 0,
      },
    },
    f: (node, inputs) => {
      return {
        output: inputs.input ?? 0,
      };
    },
    draw: (node, context, position, size) => {
      const value = node.data.output ?? 0;
      const normalized = clamp(value, 0, 1);
      const centerX = position.x + size.x / 2;
      const centerY = position.y + size.y * 0.7;
      const radius = Math.min(size.x, size.y) * 0.32;
      const startAngle = Math.PI;
      const endAngle = 0;
      const pointerAngle = startAngle + (1 - normalized) * (endAngle - startAngle);

      context.save();

      context.strokeStyle = 'rgba(80, 80, 80, 1)';
      context.lineWidth = 8;
      context.beginPath();
      context.arc(centerX, centerY, radius, startAngle, endAngle, false);
      context.stroke();

      context.strokeStyle = 'rgba(0, 140, 255, 0.9)';
      context.lineWidth = 8;
      context.beginPath();
      context.arc(centerX, centerY, radius, startAngle, pointerAngle, false);
      context.stroke();

      context.strokeStyle = 'rgba(20, 20, 20, 0.9)';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(
        centerX + Math.cos(pointerAngle) * (radius - 8),
        centerY + Math.sin(pointerAngle) * (radius - 8)
      );
      context.stroke();

      context.fillStyle = 'rgba(20, 20, 20, 1)';
      context.beginPath();
      context.arc(centerX, centerY, 5, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = 'rgba(0, 140, 255, 0.9)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 7)}px sans-serif`;
      context.fillText(
        `${value.toFixed(2)}`,
        centerX,
        position.y + size.y * 0.38
      );

      context.restore();
    },
  },
  'chart': {
    template: {
      label: 'Chart',
      size: { x: 220, y: 160 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'number',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'number',
          },
        },
      ],
      data: {
        type: 'chart',
        output: 0,
        values: [],
        configuration: {
          maxSize: 64,
          yMin: -1,
          yMax: 1,
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        maxSize: {
          type: 'number',
        },
        yMin: {
          type: 'number',
        },
        yMax: {
          type: 'number',
        },
      },
      required: ['maxSize', 'yMin', 'yMax'],
    },
    f: (node, inputs) => {
      const output = inputs.input ?? 0;
      const maxSize = Math.max(1, Math.floor(node.data.configuration.maxSize ?? 64));

      if (!Array.isArray(node.data.values)) {
        node.data.values = [];
      }

      node.data.values.push(output);
      if (node.data.values.length > maxSize) {
        node.data.values.splice(0, node.data.values.length - maxSize);
      }

      return { output };
    },
    draw: (node, context, position, size) => {
      drawChart(context, {
        type: 'area',
        position: {
          x: position.x + 14,
          y: position.y + 16,
        },
        size: {
          x: size.x - 28,
          y: size.y - 32,
        },
        series: [
          { data: node.data.values || [] },
        ],
        xAxis: {
          show: true,
          grid: true,
        },
        yAxis: {
          show: true,
          grid: true,
          range: {
            min: node.data.configuration.yMin ?? -1,
            max: node.data.configuration.yMax ?? 1,
          },
        },
      });
    },
  },
  'colour': {
    template: {
      label: 'Colour',
      size: { x: 200, y: 160 },
      ports: [
        {
          id: 'input',
          label: 'Input',
          type: 'input',
          side: 'left',
          data: {
            type: 'vector',
          },
        },
        {
          id: 'output',
          label: 'Output',
          type: 'output',
          side: 'right',
          data: {
            type: 'vector',
          },
        },
      ],
      data: {
        type: 'colour',
        output: { x: 0, y: 0, z: 0, w: 1 },
      },
    },
    f: (node, inputs) => {
      return {
        output: inputs.input ?? { x: 0, y: 0, z: 0, w: 1 },
      };
    },
    draw: (node, context, position, size) => {
      const colour = node.data.output ?? { x: 0, y: 0, z: 0, w: 1 };
      const r = clamp(colour.x ?? 0, 0, 1);
      const g = clamp(colour.y ?? 0, 0, 1);
      const b = clamp(colour.z ?? 0, 0, 1);
      const a = clamp(colour.w ?? 1, 0, 1);

      const centerX = position.x + size.x / 2;
      const centerY = position.y + size.y / 2;
      const radius = Math.min(size.x, size.y) * 0.28;
      const patternSize = Math.max(6, Math.floor(radius / 3));

      context.save();

      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.closePath();
      context.clip();

      for (let y = centerY - radius; y < centerY + radius; y += patternSize) {
        for (let x = centerX - radius; x < centerX + radius; x += patternSize) {
          const isDark =
            (Math.floor((x - (centerX - radius)) / patternSize) +
              Math.floor((y - (centerY - radius)) / patternSize)) %
              2 ===
            0;
          context.fillStyle = isDark
            ? 'rgba(180, 180, 180, 1)'
            : 'rgba(230, 230, 230, 1)';
          context.fillRect(x, y, patternSize, patternSize);
        }
      }

      context.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();

      context.restore();

      context.save();
      context.strokeStyle = 'rgba(40, 40, 40, 0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = 'rgba(20, 20, 20, 0.8)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${Math.floor(size.y / 10)}px sans-serif`;
      context.fillText(
        `${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${a.toFixed(2)}`,
        centerX,
        position.y + size.y - 18
      );
      context.restore();
    },
  },
};

const SETTINGS_SCHEMA = {
  type: 'object',
  properties: {
    showGrid: {
      type: 'boolean',
    },
    snapToGrid: {
      type: 'boolean',
    },
  },
  required: ['showGrid', 'snapToGrid'],
};

// Debug library
let Debug;

// DOM elements
// Main sections
let app, content, properties, history;

// Canvas
let canvas, context;

// Toolbar buttons
let newToolbarButton,
  openToolbarButton,
  saveToolbarButton,
  undoToolbarButton,
  redoToolbarButton,
  cutToolbarButton,
  copyToolbarButton,
  pasteToolbarButton,
  newNodeToolbarMenu,
  deleteNodeToolbarButton,
  stepToolbarButton,
  playToolbarButton,
  pauseToolbarButton,
  stopToolbarButton,
  snapAllToGridToolbarButton,
  resetCameraToolbarButton,
  settingsToolbarButton,
  themeSwitch;

// Data views
let propertiesTitle, propertyEditor, historyView, settingsEditor;

// Status bar
let statusBar, mouseStatusBarItem, selectedStatusBarItem;
let cameraStatusBarItem, zoomStatusBarItem;

let cameraStatusAnimationFrame = null;
let lastCameraStatus = {
  x: null,
  y: null,
  zoom: null,
};
let interactionHistoryDebounceTimer = null;

// Context menu items
let cutContextMenuItem,
  copyContextMenuItem,
  pasteContextMenuItem,
  newNodeContextMenuMenu,
  deleteNodeContextMenuItem;

// Prompts and dialogs
let namePrompt, settingsDialog, closeSettingsDialogButton;

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initialiseEditor();
});

function initialiseEditor() {
  console.log('Initializing Noise Graph Editor...');

  const graphBuilderApi = window.GraphBuilder;
  if (!graphBuilderApi) {
    console.error('GraphBuilder library not found!');
    return;
  }
  editorState.graphBuilderApi = graphBuilderApi;

  const GraphBuilderClass =
    graphBuilderApi.GraphBuilder || graphBuilderApi.default || graphBuilderApi;
  if (!GraphBuilderClass) {
    console.error('GraphBuilder API is incomplete or invalid!');
    return;
  }

  // Setup canvas
  canvas = document.getElementById('editor-canvas');
  context = canvas.getContext('2d');

  if (!canvas || !context) {
    console.error('Canvas element not found!');
    return;
  }

  // Get DOM elements
  app = document.querySelector('e2-app');
  content = document.querySelector('section.content');
  properties = document.querySelector('aside.properties');
  history = document.querySelector('aside.history');
  propertiesTitle = document.getElementById('properties-title');
  propertyEditor = document.getElementById('node-editor');
  historyView = document.getElementById('history-list');
  newToolbarButton = document.getElementById('new-toolbar-button');
  openToolbarButton = document.getElementById('open-toolbar-button');
  saveToolbarButton = document.getElementById('save-toolbar-button');
  undoToolbarButton = document.getElementById('undo-toolbar-button');
  redoToolbarButton = document.getElementById('redo-toolbar-button');
  cutToolbarButton = document.getElementById('cut-toolbar-button');
  copyToolbarButton = document.getElementById('copy-toolbar-button');
  pasteToolbarButton = document.getElementById('paste-toolbar-button');
  newNodeToolbarMenu = document.getElementById('new-node-toolbar-menu');
  deleteNodeToolbarButton = document.getElementById(
    'delete-node-toolbar-button'
  );
  snapAllToGridToolbarButton = document.getElementById(
    'snap-all-to-grid-toolbar-button'
  );
  resetCameraToolbarButton = document.getElementById(
    'reset-camera-toolbar-button'
  );
  settingsToolbarButton =
    document.getElementById('settings-toolbar-button') ||
    document.getElementById('settings-button');
  stepToolbarButton = document.getElementById('step-toolbar-button');
  playToolbarButton = document.getElementById('play-toolbar-button');
  pauseToolbarButton = document.getElementById('pause-toolbar-button');
  stopToolbarButton = document.getElementById('stop-toolbar-button');
  themeSwitch = document.querySelector('.theme-switch input');
  statusBar = document.getElementById('status-bar');
  mouseStatusBarItem = document.getElementById('mouse-status');
  selectedStatusBarItem = document.getElementById('selected-status');
  cameraStatusBarItem = document.getElementById('camera-status');
  zoomStatusBarItem = document.getElementById('zoom-status');
  namePrompt = document.getElementById('name-prompt');
  settingsDialog = document.getElementById('settings-dialog');
  settingsEditor = document.getElementById('settings-editor');
  closeSettingsDialogButton = document.getElementById(
    'close-settings-dialog-button'
  );
  cutContextMenuItem = document.getElementById('cut-context-menu-item');
  copyContextMenuItem = document.getElementById('copy-context-menu-item');
  pasteContextMenuItem = document.getElementById('paste-context-menu-item');
  newNodeContextMenuMenu = document.getElementById(
    'new-node-context-menu-menu'
  );
  deleteNodeContextMenuItem = document.getElementById(
    'delete-node-context-menu-item'
  );

  // Configure history view
  if (historyView) {
    historyView.columns = [
      { id: 'label', label: '#', width: '2em' },
      { id: 'action', label: 'Action' },
      { id: 'date', label: 'Date', width: '55px' },
      { id: 'current', label: 'Current', width: '1em' },
    ];
  }

  // Initialise settings editor
  settingsEditor.value = Object.fromEntries(
    Object.entries(editorState.settings).filter(([key]) => key !== 'theme')
  );
  settingsEditor.schema = SETTINGS_SCHEMA;

  setupNoGraphMessageOverlay();

  try {
    editorState.graphBuilder = new GraphBuilderClass(canvas, {
      autoStart: true,
      canConnectPorts: ({ fromPort, toPort }) => {
        if (
          fromPort.data.type &&
          toPort.data.type &&
          fromPort.data.type !== toPort.data.type
        ) {
          return {
            allowed: false,
            reason: 'Port types do not match',
          };
        }

        return { allowed: true };
      },
      callbacks: {
        renderModes: {
          drawNodeContent: 'overlay',
        },
        drawNodeContent(context, { node, position, size }) {
          NODE_TYPES[node.data.type]?.draw?.(node, context, position, size);
        },
      },
    });
    editorState.graphBuilder.setCreateNodeTemplate(
      NODE_TYPES[INITIAL_NODE_TEMPLATE].template
    );
  } catch (error) {
    console.error('Failed to create GraphBuilder instance:', error);
    return;
  }

  setupCanvas();
  setupEventListeners();
  applyGraphBuilderTheme();
  themeSwitch.checked = editorState.settings.theme === 'dark';
  app.setAttribute('theme', editorState.settings.theme);
  settingsDialog.setAttribute('theme', editorState.settings.theme);

  wireGraphBuilderEvents();
  startCameraStatusSync();
  updateTitle();
  updateStatusBar();
  updateCameraStatusBar(true);
  updatePropertyEditor();
  updateHistoryView();
  updateToolbarButtons();
  updateContextMenuButtons();
  updateNoGraphMessage();

  console.log('Noise Graph Editor initialised successfully');
}

function setupNoGraphMessageOverlay() {
  NO_GRAPH_MESSAGE = document.createElement('div');
  NO_GRAPH_MESSAGE.id = 'no-graph-message';
  NO_GRAPH_MESSAGE.textContent = 'No graph loaded';
  NO_GRAPH_MESSAGE.style.position = 'absolute';
  NO_GRAPH_MESSAGE.style.top = '50%';
  NO_GRAPH_MESSAGE.style.left = '50%';
  NO_GRAPH_MESSAGE.style.transform = 'translate(-50%, -50%)';
  NO_GRAPH_MESSAGE.style.pointerEvents = 'none';
  NO_GRAPH_MESSAGE.style.fontSize = '16px';
  NO_GRAPH_MESSAGE.style.fontFamily = 'sans-serif';
  NO_GRAPH_MESSAGE.style.opacity = '0.75';
  NO_GRAPH_MESSAGE.style.userSelect = 'none';
  content.appendChild(NO_GRAPH_MESSAGE);
}

function applyGraphBuilderTheme() {
  if (!editorState.graphBuilder) {
    return;
  }

  const theme =
    editorState.settings.theme === 'dark'
      ? DARK_MODE_GRAPH_THEME
      : LIGHT_MODE_GRAPH_THEME;
  editorState.graphBuilder.setTheme(theme);
}

function wireGraphBuilderEvents() {
  const graphBuilder = editorState.graphBuilder;

  graphBuilder.on('nodeSelected', ({ nodeId }) => {
    editorState.selectedNodeId = nodeId;
    updateStatusBar();
    updatePropertyEditor();
    updateToolbarButtons();
    updateContextMenuButtons();
  });

  graphBuilder.on('nodeCreated', () => {
    recordHistory('Node created');
    updatePropertyEditor();
    updateToolbarButtons();
  });

  graphBuilder.on('nodeRemoved', () => {
    const selectedNodeId = editorState.selectedNodeId;
    if (selectedNodeId && !findNodeById(selectedNodeId)) {
      editorState.selectedNodeId = null;
    }
    recordHistory('Node removed');
    updateStatusBar();
    updatePropertyEditor();
    updateToolbarButtons();
    updateContextMenuButtons();
  });

  graphBuilder.on('nodeMoved', () => {
    queueInteractionHistory('Node moved');
    updatePropertyEditor();
  });

  graphBuilder.on('nodeResized', () => {
    queueInteractionHistory('Node resized');
    updatePropertyEditor();
  });

  graphBuilder.on('nodeDataUpdated', () => {
    recordHistory('Node data updated');
    updatePropertyEditor();
  });

  graphBuilder.on('edgeCreated', () => {
    recordHistory('Edge created');
  });

  graphBuilder.on('edgeRemoved', () => {
    recordHistory('Edge removed');
  });
}

function setupCanvas() {
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Handle canvas resize observer for more responsive updates
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(content);
    resizeObserver.observe(properties);
    resizeObserver.observe(history);
  }
}

function resizeCanvas() {
  const rect = content.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.top = '0px';
  canvas.style.left = '0px';
  editorState.canvasSize.x = canvas.width;
  editorState.canvasSize.y = canvas.height;

  if (editorState.graphBuilder) {
    editorState.graphBuilder.resize();
  }
}

function setupEventListeners() {
  themeSwitch.addEventListener('change', e => {
    editorState.settings.theme = e.target.checked ? 'dark' : 'light';
    app.setAttribute('theme', editorState.settings.theme);
    settingsDialog.setAttribute('theme', editorState.settings.theme);
    applyGraphBuilderTheme();

    if (NO_GRAPH_MESSAGE) {
      NO_GRAPH_MESSAGE.style.color =
        editorState.settings.theme === 'dark' ? '#b3b3b3' : '#666666';
    }
  });

  content.addEventListener('mousemove', e => {
    const rect = content.getBoundingClientRect();
    editorState.mousePosition = {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
    updateStatusBar();
  });

  document.addEventListener('toolbar-button-click', async e => {
    await handleToolbarAction(e.detail.button.getAttribute('action'));
  });

  document.addEventListener('context-menu-show', e => {
    editorState.contextMenuPosition = { x: e.detail.x, y: e.detail.y };

    if (!editorState.graphLoaded) {
      editorState.contextNodeId = null;
      updateContextMenuButtons();
      return;
    }

    if (e.detail.trigger === canvas) {
      editorState.contextNodeId = editorState.selectedNodeId;
      updateContextMenuButtons();
    }
  });

  document.addEventListener('context-menu-item-click', e => {
    handleContextMenuAction(
      e.detail.item.getAttribute('action'),
      e.detail.item.dataset.nodeType
    );
  });

  document.addEventListener('listview-selection-change', e => {
    if (e.target === historyView) {
      handleHistorySelection(e);
    }
  });

  // Commit move/resize history entries when pointer interactions end,
  // allowing a short quiet period for post-release easing updates.
  document.addEventListener('pointerup', handlePointerInteractionEnd);
  document.addEventListener('pointercancel', handlePointerInteractionEnd);
  document.addEventListener('mouseup', handlePointerInteractionEnd);
  document.addEventListener('touchend', handlePointerInteractionEnd);

  // Fallback commits if pointerup is missed due to focus changes.
  window.addEventListener('blur', flushPendingInteractionHistory);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushPendingInteractionHistory();
    }
  });

  settingsEditor.addEventListener('keyvalue-change', handleSettingsChange);
  propertyEditor.addEventListener('keyvalue-change', handleNodeEditorChange);

  closeSettingsDialogButton?.addEventListener('click', () => {
    settingsDialog?.close();
  });

  document.addEventListener('keydown', async e => {
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    if (
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') ||
      (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'y')
    ) {
      e.preventDefault();
      redo();
      return;
    }

    if (!editorState.graphLoaded) {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        await handleToolbarAction('new');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        await handleToolbarAction('open');
      }
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copySelectedNode();
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      cutSelectedNode();
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteClipboardNode();
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      deleteSelectedNode();
      return;
    }
  });
}

async function handleToolbarAction(action) {
  console.log('Toolbar action:', action);

  switch (action) {
    case 'new':
      createNewGraphDocument();
      break;
    case 'open':
      await openGraphDocument();
      break;
    case 'save':
      await saveGraphDocument();
      break;
    case 'undo':
      undo();
      break;
    case 'redo':
      redo();
      break;
    case 'cut':
      cutSelectedNode();
      break;
    case 'copy':
      copySelectedNode();
      break;
    case 'paste':
      pasteClipboardNode();
      break;
    case 'delete-node':
      deleteSelectedNode();
      break;
    case 'snap-all-to-grid':
      snapAllNodesToGrid();
      break;
    case 'reset-camera':
      resetCamera();
      break;
    case 'step':
      if (!stepGraph()) {
        E2.Toast.error('Cannot traverse: graph contains a cycle.', { title: 'Cycle Detected' });
      }
      break;
    case 'play':
      startPlayback();
      break;
    case 'pause':
      pausePlayback();
      break;
    case 'stop':
      stopPlayback();
      break;
    case 'settings':
      settingsDialog?.showModal();
      break;
    default:
      console.warn('Unknown toolbar action:', action);
  }
}

function handleContextMenuAction(action, nodeType) {
  switch (action) {
    case 'cut-context':
      cutSelectedNode();
      break;
    case 'copy-context':
      copySelectedNode();
      break;
    case 'paste-context':
      pasteClipboardNode({ useContextPosition: true });
      break;
    case 'delete-node-context':
      deleteSelectedNode();
      break;
    case 'new-node':
      if (nodeType) {
        createNode({ x: 0, y: 0 }, nodeType);
      }
      break;
    case 'new-node-context':
      if (nodeType) {
        createNode(screenToWorld(editorState.contextMenuPosition), nodeType, {
          centerOnPosition: true,
        });
      }
      break;
    default:
      console.warn('Unknown context action:', action);
  }
}

function handleHistorySelection(event) {
  flushPendingInteractionHistory();

  const { selectedItems } = event.detail;
  if (!selectedItems || selectedItems.length === 0) {
    return;
  }

  const selectedItem = selectedItems[0];
  const historyIndex = parseInt(selectedItem.id, 10);
  if (!Number.isNaN(historyIndex)) {
    jumpToHistoryIndex(historyIndex);
  }
}

function handleSettingsChange(event) {
  console.log('Settings changed:', event.detail);

  settingsEditor.validate();
  if (settingsEditor.isValid()) {
    editorState.settings = {
      ...editorState.settings,
      ...settingsEditor.value,
    };
  }

  editorState.graphBuilder.setShowGrid(editorState.settings.showGrid);
  editorState.graphBuilder.setSnapToGrid(editorState.settings.snapToGrid);
}

function handleNodeEditorChange(event) {
  console.log('Node data changed:', event.detail);

  if (
    !editorState.graphLoaded ||
    !editorState.selectedNodeId ||
    !editorState.graphBuilder
  ) {
    return;
  }

  propertyEditor.validate();
  if (!propertyEditor.isValid()) {
    return;
  }

  const selectedNode = findNodeById(editorState.selectedNodeId);
  if (!selectedNode) {
    return;
  }

  const currentData = selectedNode.data || {};
  const currentConfiguration = currentData.configuration || {};
  const nextConfiguration = propertyEditor.value || {};

  if (JSON.stringify(currentConfiguration) === JSON.stringify(nextConfiguration)) {
    return;
  }

  editorState.graphBuilder.setNodeData(
    editorState.selectedNodeId,
    {
      ...currentData,
      configuration: JSON.parse(JSON.stringify(nextConfiguration)),
    }
  );
}

function updateTitle() {
  document.title = `${TITLE} - ${editorState.graphName || 'Untitled'}${editorState.dirty ? ' (modified)' : ''
    }`;
}

function updateStatusBar() {
  if (mouseStatusBarItem) {
    mouseStatusBarItem.setAttribute(
      'value',
      `(${editorState.mousePosition.x}, ${editorState.mousePosition.y})`
    );
  }

  if (!selectedStatusBarItem) {
    return;
  }

  const selectedNode = editorState.selectedNodeId
    ? findNodeById(editorState.selectedNodeId)
    : null;

  if (!selectedNode) {
    selectedStatusBarItem.setAttribute('value', 'None');
    return;
  }

  selectedStatusBarItem.setAttribute(
    'value',
    `${selectedNode.id} (${Math.round(selectedNode.size.x)}x${Math.round(
      selectedNode.size.y
    )})`
  );
}

function updateCameraStatusBar(force = false) {
  if (!cameraStatusBarItem || !zoomStatusBarItem) {
    return;
  }

  if (!editorState.graphBuilder) {
    if (force) {
      cameraStatusBarItem.setAttribute('value', '(0, 0)');
      zoomStatusBarItem.setAttribute('value', '100%');
    }
    return;
  }

  const cameraPosition = editorState.graphBuilder.getCameraPosition();
  const zoom = editorState.graphBuilder.getCameraZoom();

  const x = Math.round(cameraPosition.x);
  const y = Math.round(cameraPosition.y);
  const zoomPercent = Math.round(zoom * 100);

  if (
    force ||
    x !== lastCameraStatus.x ||
    y !== lastCameraStatus.y ||
    zoomPercent !== lastCameraStatus.zoom
  ) {
    cameraStatusBarItem.setAttribute('value', `(${x}, ${y})`);
    zoomStatusBarItem.setAttribute('value', `${zoomPercent}%`);
    lastCameraStatus = {
      x,
      y,
      zoom: zoomPercent,
    };
  }
}

function startCameraStatusSync() {
  if (cameraStatusAnimationFrame !== null) {
    cancelAnimationFrame(cameraStatusAnimationFrame);
  }

  const tick = () => {
    updateCameraStatusBar();
    cameraStatusAnimationFrame = requestAnimationFrame(tick);
  };

  cameraStatusAnimationFrame = requestAnimationFrame(tick);
}

function updatePropertyEditor() {
  if (!propertyEditor) {
    return;
  }

  const selectedNode = editorState.selectedNodeId
    ? findNodeById(editorState.selectedNodeId)
    : null;

  if (!selectedNode) {
    if (!isObjectShallowlyEmpty(propertyEditor.value)) {
      propertyEditor.value = {};
    }
    if (propertyEditor.schema !== undefined) {
      propertyEditor.schema = undefined;
    }
    propertiesTitle.innerText = 'Node Properties';
    return;
  }

  const nodeType = selectedNode.data.type;
  const nextValue = selectedNode.data?.configuration || {};
  const nextSchema = NODE_TYPES[nodeType]?.schema;

  // Avoid reassigning value/schema when unchanged, which forces a rerender
  // and can steal focus from active inputs while typing.
  if (!isJsonEqual(propertyEditor.value, nextValue)) {
    propertyEditor.value = nextValue;
  }
  if (propertyEditor.schema !== nextSchema) {
    propertyEditor.schema = nextSchema;
  }
  propertiesTitle.innerText = 'Node Properties';
}

function isObjectShallowlyEmpty(value) {
  if (!value || typeof value !== 'object') {
    return true;
  }

  return Object.keys(value).length === 0;
}

function isJsonEqual(a, b) {
  try {
    return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
  } catch {
    return false;
  }
}

function updateHistoryView() {
  if (!historyView) {
    return;
  }

  const { snapshots, currentIndex } = editorState.history;
  if (!editorState.graphLoaded || snapshots.length === 0) {
    historyView.items = [];
    return;
  }

  const items = snapshots.map(({ action, date }, index) => ({
    id: index.toString(),
    label: (index + 1).toString(),
    data: {
      action,
      date: formatDateForHistoryView(date),
      current: index === currentIndex ? '✅' : '⬛',
    },
  }));

  historyView.items = items;
  if (currentIndex >= 0 && currentIndex < items.length) {
    historyView.deselectAll?.();
    historyView.selectItem?.(currentIndex.toString());
  }
}

function updateToolbarButtons() {
  const hasGraph = editorState.graphLoaded;
  const hasSelection = !!findNodeById(editorState.selectedNodeId);
  const hasClipboard = !!editorState.clipboard;

  if (saveToolbarButton) {
    if (hasGraph) {
      saveToolbarButton.removeAttribute('disabled');
    } else {
      saveToolbarButton.setAttribute('disabled', '');
    }
  }

  if (undoToolbarButton) {
    if (canUndo()) {
      undoToolbarButton.removeAttribute('disabled');
    } else {
      undoToolbarButton.setAttribute('disabled', '');
    }
  }

  if (redoToolbarButton) {
    if (canRedo()) {
      redoToolbarButton.removeAttribute('disabled');
    } else {
      redoToolbarButton.setAttribute('disabled', '');
    }
  }

  if (cutToolbarButton) {
    if (hasGraph && hasSelection) {
      cutToolbarButton.removeAttribute('disabled');
    } else {
      cutToolbarButton.setAttribute('disabled', '');
    }
  }

  if (copyToolbarButton) {
    if (hasGraph && hasSelection) {
      copyToolbarButton.removeAttribute('disabled');
    } else {
      copyToolbarButton.setAttribute('disabled', '');
    }
  }

  if (pasteToolbarButton) {
    if (hasGraph && hasClipboard) {
      pasteToolbarButton.removeAttribute('disabled');
    } else {
      pasteToolbarButton.setAttribute('disabled', '');
    }
  }

  if (newNodeToolbarMenu) {
    if (hasGraph) {
      newNodeToolbarMenu.removeAttribute('disabled');
    } else {
      newNodeToolbarMenu.setAttribute('disabled', '');
    }
  }

  if (deleteNodeToolbarButton) {
    if (hasGraph && hasSelection) {
      deleteNodeToolbarButton.removeAttribute('disabled');
    } else {
      deleteNodeToolbarButton.setAttribute('disabled', '');
    }
  }

  const { playing, active } = editorState.transport;

  if (stepToolbarButton) {
    if (hasGraph && !playing) {
      stepToolbarButton.removeAttribute('disabled');
    } else {
      stepToolbarButton.setAttribute('disabled', '');
    }
  }

  if (playToolbarButton) {
    if (hasGraph && !playing) {
      playToolbarButton.removeAttribute('disabled');
    } else {
      playToolbarButton.setAttribute('disabled', '');
    }
  }

  if (pauseToolbarButton) {
    if (playing) {
      pauseToolbarButton.removeAttribute('disabled');
    } else {
      pauseToolbarButton.setAttribute('disabled', '');
    }
  }

  if (stopToolbarButton) {
    if (active) {
      stopToolbarButton.removeAttribute('disabled');
    } else {
      stopToolbarButton.setAttribute('disabled', '');
    }
  }
}

function updateContextMenuButtons() {
  const hasGraph = editorState.graphLoaded;
  const hasSelection = !!findNodeById(editorState.selectedNodeId);
  const hasClipboard = !!editorState.clipboard;

  if (cutContextMenuItem) {
    if (hasGraph && hasSelection) {
      cutContextMenuItem.removeAttribute('disabled');
    } else {
      cutContextMenuItem.setAttribute('disabled', '');
    }
  }

  if (copyContextMenuItem) {
    if (hasGraph && hasSelection) {
      copyContextMenuItem.removeAttribute('disabled');
    } else {
      copyContextMenuItem.setAttribute('disabled', '');
    }
  }

  if (pasteContextMenuItem) {
    if (hasGraph && hasClipboard) {
      pasteContextMenuItem.removeAttribute('disabled');
    } else {
      pasteContextMenuItem.setAttribute('disabled', '');
    }
  }

  if (newNodeContextMenuMenu) {
    if (hasGraph) {
      newNodeContextMenuMenu.removeAttribute('disabled');
    } else {
      newNodeContextMenuMenu.setAttribute('disabled', '');
    }
  }

  if (deleteNodeContextMenuItem) {
    if (hasGraph && hasSelection) {
      deleteNodeContextMenuItem.removeAttribute('disabled');
    } else {
      deleteNodeContextMenuItem.setAttribute('disabled', '');
    }
  }
}

function updateNoGraphMessage() {
  if (canvas) {
    canvas.style.opacity = editorState.graphLoaded ? '1' : '0';
  }

  if (!NO_GRAPH_MESSAGE) {
    return;
  }

  NO_GRAPH_MESSAGE.style.display = editorState.graphLoaded ? 'none' : 'block';
  NO_GRAPH_MESSAGE.style.color =
    editorState.settings.theme === 'dark' ? '#b3b3b3' : '#666666';
}

function createNewGraphDocument() {
  if (!editorState.graphBuilder) {
    return;
  }

  pausePlayback();
  editorState.transport.active = false;

  editorState.suspendHistory = true;
  try {
    editorState.graphBuilder.load({ nodes: [], edges: [] });
    editorState.graphBuilder.selectNode(null);
  } finally {
    editorState.suspendHistory = false;
  }

  editorState.graphLoaded = true;
  editorState.graphName = 'Untitled';
  editorState.selectedNodeId = null;
  editorState.clipboard = null;

  initialiseHistory('New graph');
  updateDirtyState();
  updateTitle();
  updateStatusBar();
  updatePropertyEditor();
  updateHistoryView();
  updateToolbarButtons();
  updateContextMenuButtons();
  updateNoGraphMessage();

  // Show success message
  E2.Toast.success('New noise graph created!');
}

async function openGraphDocument() {
  pausePlayback();
  editorState.transport.active = false;

  let fileName = 'Untitled';
  let text;

  try {
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Noise Graph Document',
            accept: { 'application/json': ['.json', '.graph.json'] },
          },
        ],
        multiple: false,
      });
      if (!fileHandle) return;
      const file = await fileHandle.getFile();
      fileName = file.name.replace(/\.[^.]+$/, '');
      text = await file.text();
    } else {
      const file = await openFileWithInput();
      if (!file) return;
      fileName = file.name.replace(/\.[^.]+$/, '');
      text = await file.text();
    }
  } catch (error) {
    console.warn('Open graph cancelled or failed:', error);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error('Invalid graph document JSON:', error);
    return;
  }

  editorState.suspendHistory = true;
  try {
    if (parsed?.type === 'graph-document') {
      editorState.graphBuilder.loadFromDocument(parsed);
    } else if (parsed?.nodes && parsed?.edges) {
      editorState.graphBuilder.load(parsed);
      editorState.graphBuilder.selectNode(null);
    } else {
      throw new Error('Unsupported graph document format');
    }
  } catch (error) {
    editorState.suspendHistory = false;
    console.error('Failed to load graph document:', error);
    return;
  }
  editorState.suspendHistory = false;

  editorState.graphLoaded = true;
  editorState.graphName = fileName || 'Untitled';
  editorState.selectedNodeId = null;
  editorState.clipboard = null;

  initialiseHistory('New graph');
  updateDirtyState();
  updateTitle();
  updateStatusBar();
  updatePropertyEditor();
  updateHistoryView();
  updateToolbarButtons();
  updateContextMenuButtons();
  updateNoGraphMessage();

  // Show success message
  E2.Toast.success('Noise graph loaded successfully!');
}

async function saveGraphDocument() {
  flushPendingInteractionHistory();

  if (!editorState.graphLoaded || !editorState.graphBuilder) {
    return;
  }

  const documentData = editorState.graphBuilder.serializeFull();
  const json = JSON.stringify(documentData, null, 2);
  const suggestedName = `${editorState.graphName || 'noise-graph'}.graph.json`;

  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'Noise Graph Document',
            accept: { 'application/json': ['.graph.json', '.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    } else {
      downloadTextFile(suggestedName, json, 'application/json');
    }
  } catch (error) {
    console.warn('Save graph cancelled or failed:', error);
    return;
  }

  editorState.savedHistoryIndex = editorState.history.currentIndex;
  updateDirtyState();
  updateTitle();
  updateToolbarButtons();

  // Show success message
  E2.Toast.success('Noise graph saved successfully!');
}

function copySelectedNode() {
  if (!editorState.graphLoaded || !editorState.selectedNodeId) {
    return false;
  }

  const node = findNodeById(editorState.selectedNodeId);
  if (!node) {
    return false;
  }

  editorState.clipboard = JSON.parse(JSON.stringify(node));
  updateToolbarButtons();
  updateContextMenuButtons();
  return true;
}

function cutSelectedNode() {
  if (!copySelectedNode()) {
    return false;
  }

  return deleteSelectedNode();
}

function pasteClipboardNode(options = {}) {
  if (
    !editorState.graphLoaded ||
    !editorState.clipboard ||
    !editorState.graphBuilder
  ) {
    return false;
  }

  const { useContextPosition = false } = options;
  const source = editorState.clipboard;
  const position = useContextPosition
    ? screenToWorld(editorState.contextMenuPosition)
    : {
      x: editorState.canvasSize.x / 2 - source.size.x / 2,
      y: editorState.canvasSize.y / 2 - source.size.y / 2,
    };

  const pastedNode = editorState.graphBuilder.createNode(position, {
    label: source.label,
    size: source.size,
    ports: source.ports,
    resizable: source.resizable,
    deletable: source.deletable,
    data: source.data,
  });

  if (!pastedNode) {
    return false;
  }

  editorState.graphBuilder.selectNode(pastedNode.id);
  return true;
}

function deleteSelectedNode() {
  if (
    !editorState.graphLoaded ||
    !editorState.selectedNodeId ||
    !editorState.graphBuilder
  ) {
    return false;
  }

  const selectedNodeId = editorState.selectedNodeId;
  const removed = editorState.graphBuilder.removeNode(selectedNodeId);
  if (!removed) {
    return false;
  }

  editorState.selectedNodeId = null;
  updateStatusBar();
  updatePropertyEditor();
  updateToolbarButtons();
  updateContextMenuButtons();
  return true;
}

function snapAllNodesToGrid() {
  if (!editorState.graphLoaded || !editorState.graphBuilder) {
    return false;
  }

  editorState.graphBuilder.snapAllToGrid({ snapPositions: true, snapSizes: true });
  return true;
}

function resetCamera() {
  if (!editorState.graphBuilder) {
    return false;
  }

  editorState.graphBuilder.setCameraPosition({ x: 0, y: 0 });
  editorState.graphBuilder.setCameraZoom(1);
  updateCameraStatusBar(true);
  return true;
}

function screenToWorld(screenPosition) {
  const rect = canvas.getBoundingClientRect();
  const zoom = editorState.graphBuilder.getCameraZoom();
  const cameraPosition = editorState.graphBuilder.getCameraPosition();
  const canvasX = screenPosition.x - rect.left;
  const canvasY = screenPosition.y - rect.top;
  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;

  return {
    x: cameraPosition.x + (canvasX - halfWidth) / zoom,
    y: cameraPosition.y + (canvasY - halfHeight) / zoom,
  };
}

function createNode(position, type, options = {}) {
  if (!editorState.graphLoaded || !editorState.graphBuilder) {
    return false;
  }

  const template = NODE_TYPES[type].template;
  const createPosition = options.centerOnPosition
    ? {
      x: position.x - template.size.x / 2,
      y: position.y - template.size.y / 2,
    }
    : position;

  const node = editorState.graphBuilder.createNode(createPosition, {
    label: template.label,
    size: template.size,
    ports: template.ports.map(port => ({
      ...port,
      ...({
        number: NUMBER_PORT_THEME,
        vector: VECTOR_PORT_THEME,
      }[port.data.type] || {}),
    })),
    data: cloneGraphDocument(template.data),
  });

  if (!node) {
    return false;
  }

  editorState.graphBuilder.selectNode(node.id);
  return true;
}

function cloneGraphDocument(documentData) {
  return JSON.parse(JSON.stringify(documentData));
}

function initialiseHistory(action) {
  clearPendingInteractionHistoryState();

  editorState.history.snapshots = [];
  editorState.history.currentIndex = -1;
  editorState.savedHistoryIndex = -1;

  recordHistory(action);
  editorState.savedHistoryIndex = editorState.history.currentIndex;
  updateDirtyState();
  updateHistoryView();
  updateToolbarButtons();
}

function recordHistory(action = 'Unknown') {
  if (
    editorState.suspendHistory ||
    !editorState.graphLoaded ||
    !editorState.graphBuilder
  ) {
    return;
  }

  const { history } = editorState;

  if (history.currentIndex < history.snapshots.length - 1) {
    history.snapshots = history.snapshots.slice(0, history.currentIndex + 1);
    if (editorState.savedHistoryIndex > history.currentIndex) {
      editorState.savedHistoryIndex = -1;
    }
  }

  history.snapshots.push({
    action,
    date: new Date(),
    document: cloneGraphDocument(editorState.graphBuilder.serializeFull()),
  });
  history.currentIndex = history.snapshots.length - 1;

  updateDirtyState();
  updateTitle();
  updateHistoryView();
  updateToolbarButtons();
}

function schedulePendingInteractionHistoryFlush(delayMs) {
  if (interactionHistoryDebounceTimer !== null) {
    clearTimeout(interactionHistoryDebounceTimer);
  }

  interactionHistoryDebounceTimer = setTimeout(() => {
    flushPendingInteractionHistory();
  }, delayMs);
}

function handlePointerInteractionEnd() {
  editorState.isPointerInteractionActive = false;

  if (!editorState.pendingInteractionHistoryAction) {
    return;
  }

  schedulePendingInteractionHistoryFlush(POINTERUP_HISTORY_QUIET_PERIOD_MS);
}

function queueInteractionHistory(action) {
  if (
    editorState.suspendHistory ||
    !editorState.graphLoaded ||
    !editorState.graphBuilder
  ) {
    return;
  }

  // Preserve the most meaningful action label during mixed interactions.
  if (
    editorState.pendingInteractionHistoryAction !== 'Node resized' ||
    action === 'Node resized'
  ) {
    editorState.pendingInteractionHistoryAction = action;
  }
  editorState.isPointerInteractionActive = true;

  schedulePendingInteractionHistoryFlush(INTERACTION_HISTORY_DEBOUNCE_MS);
}

function clearPendingInteractionHistoryState() {
  if (interactionHistoryDebounceTimer !== null) {
    clearTimeout(interactionHistoryDebounceTimer);
    interactionHistoryDebounceTimer = null;
  }

  editorState.pendingInteractionHistoryAction = null;
  editorState.isPointerInteractionActive = false;
}

function flushPendingInteractionHistory() {
  if (!editorState.pendingInteractionHistoryAction) {
    clearPendingInteractionHistoryState();
    return false;
  }

  const action = editorState.pendingInteractionHistoryAction;
  clearPendingInteractionHistoryState();
  recordHistory(action);
  return true;
}

function undo() {
  flushPendingInteractionHistory();

  if (!canUndo() || !editorState.graphBuilder) {
    return false;
  }

  editorState.history.currentIndex--;
  const snapshot =
    editorState.history.snapshots[editorState.history.currentIndex];

  editorState.suspendHistory = true;
  try {
    editorState.graphBuilder.loadFromDocument(
      loneGraphDocument(snapshot.document)
    );
  } finally {
    editorState.suspendHistory = false;
  }

  editorState.selectedNodeId = snapshot.document.layout?.selectedNodeId || null;
  updateDirtyState();
  updateTitle();
  updateStatusBar();
  updatePropertyEditor();
  updateHistoryView();
  updateToolbarButtons();
  updateContextMenuButtons();

  return true;
}

function redo() {
  flushPendingInteractionHistory();

  if (!canRedo() || !editorState.graphBuilder) {
    return false;
  }

  editorState.history.currentIndex++;
  const snapshot =
    editorState.history.snapshots[editorState.history.currentIndex];

  editorState.suspendHistory = true;
  try {
    editorState.graphBuilder.loadFromDocument(
      cloneGraphDocument(snapshot.document)
    );
  } finally {
    editorState.suspendHistory = false;
  }

  editorState.selectedNodeId = snapshot.document.layout?.selectedNodeId || null;
  updateDirtyState();
  updateTitle();
  updateStatusBar();
  updatePropertyEditor();
  updateHistoryView();
  updateToolbarButtons();
  updateContextMenuButtons();

  return true;
}

function canUndo() {
  return editorState.history.currentIndex > 0;
}

function canRedo() {
  const { history } = editorState;
  return (
    history.currentIndex >= 0 &&
    history.currentIndex < history.snapshots.length - 1
  );
}

function jumpToHistoryIndex(targetIndex) {
  flushPendingInteractionHistory();

  const { history } = editorState;

  if (
    targetIndex < 0 ||
    targetIndex >= history.snapshots.length ||
    targetIndex === history.currentIndex ||
    !editorState.graphBuilder
  ) {
    return false;
  }

  history.currentIndex = targetIndex;
  const snapshot = history.snapshots[targetIndex];

  editorState.suspendHistory = true;
  try {
    editorState.graphBuilder.loadFromDocument(
      cloneGraphDocument(snapshot.document)
    );
  } finally {
    editorState.suspendHistory = false;
  }

  editorState.selectedNodeId = snapshot.document.layout?.selectedNodeId || null;
  updateDirtyState();
  updateTitle();
  updateStatusBar();
  updatePropertyEditor();
  updateHistoryView();
  updateToolbarButtons();
  updateContextMenuButtons();

  return true;
}

function updateDirtyState() {
  editorState.dirty =
    editorState.graphLoaded &&
    editorState.savedHistoryIndex !== editorState.history.currentIndex;
}

function findNodeById(nodeId) {
  if (!nodeId || !editorState.graphBuilder) {
    return null;
  }

  const graph = editorState.graphBuilder.getGraph();
  return graph.nodes.find(node => node.id === nodeId) || null;
}

function formatDateForHistoryView(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openFileWithInput() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.graph.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };
    input.click();
  });
}

function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------------------------
// Transport (step / play / pause / stop)
// -----------------------------------------------------------------------------

function stepGraph() {
  if (!editorState.graphLoaded || !editorState.graphBuilder) {
    return false;
  }

  editorState.suspendHistory = true;
  let success = true;
  try {
    const result = editorState.graphBuilder.traverseTopological((node) => {
      const nodeType = NODE_TYPES[node.data?.type];
      if (!nodeType?.f) {
        return;
      }
      const inputs = node.ports.reduce((a, c) => ({
        ...a,
        ...(c.type === 'input'
          ? {
            [c.id]: c.connectedEdge?.data?.value ?? null,
          }
          : {}),
      }), {});
      const outputs = nodeType.f(node, inputs);
      editorState.graphBuilder.setNodeData(node.id, {
        ...node.data,
        ...outputs,
      });
      for (const port of node.ports) {
        if (port.type === 'output' && outputs[port.id] !== undefined) {
          for (const edge of (port.connectedEdges ?? [])) {
            editorState.graphBuilder.setEdgeData(
              edge.a,
              edge.b,
              { value: outputs[port.id] }
            );
          }
        }
      }
    });

    if (result === null) {
      success = false;
    }
  } finally {
    editorState.suspendHistory = false;
  }

  return success;
}

function startPlayback() {
  if (!editorState.graphLoaded || !editorState.graphBuilder) {
    return;
  }

  if (editorState.graphBuilder.hasCycle()) {
    E2.Toast.error('Cannot start playback: graph contains a cycle.', {
      title: 'Cycle Detected',
    });
    return;
  }

  editorState.transport.playing = true;
  editorState.transport.active = true;
  updateToolbarButtons();

  function loop() {
    if (!editorState.transport.playing) {
      return;
    }

    const success = stepGraph();
    if (!success) {
      E2.Toast.error('Playback stopped: graph contains a cycle.', {
        title: 'Cycle Detected',
      });
      pausePlayback();
      return;
    }

    editorState.transport.animationFrameId = requestAnimationFrame(loop);
  }

  editorState.transport.animationFrameId = requestAnimationFrame(loop);
}

function pausePlayback() {
  if (!editorState.transport.playing) {
    return;
  }

  editorState.transport.playing = false;
  if (editorState.transport.animationFrameId !== null) {
    cancelAnimationFrame(editorState.transport.animationFrameId);
    editorState.transport.animationFrameId = null;
  }

  updateToolbarButtons();
}

function stopPlayback() {
  editorState.transport.playing = false;
  editorState.transport.active = false;
  if (editorState.transport.animationFrameId !== null) {
    cancelAnimationFrame(editorState.transport.animationFrameId);
    editorState.transport.animationFrameId = null;
  }

  // Reset all node data to defaults, preserving each node's configuration
  if (editorState.graphBuilder) {
    const graph = editorState.graphBuilder.getGraph();
    editorState.suspendHistory = true;
    try {
      for (const node of graph.nodes) {
        const nodeType = NODE_TYPES[node.data?.type];
        if (nodeType) {
          editorState.graphBuilder.setNodeData(node.id, {
            ...nodeType.template.data,
            configuration: node.data?.configuration,
          });
        }
      }
    } finally {
      editorState.suspendHistory = false;
    }
  }

  updateToolbarButtons();
}
