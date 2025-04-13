declare module 'react-native-circular-slider' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface CircularSliderProps {
    size: number;
    width: number;
    backgroundWidth?: number;
    fill?: number;
    tint?: string;
    rotation?: number;
    lineCap?: 'butt' | 'round' | 'square';
    onUpdate?: (value: { fill: number }) => void;
    stepSize?: number;
    maxValue?: number;
    minValue?: number;
    startAngle?: number;
    endAngle?: number;
    value?: number;
    buttonRadius?: number;
    buttonBorderColor?: string;
    buttonFillColor?: string;
    openingRadian?: number;
    renderCenterContent?: () => React.ReactNode;
    style?: ViewStyle;
  }

  export default class CircularSlider extends Component<CircularSliderProps> {}
} 