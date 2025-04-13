declare module 'react-native-svg-circular-progress' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface CircularProgressProps {
    size?: number;
    width?: number;
    fill?: number;
    tintColor?: string;
    backgroundColor?: string;
    rotation?: number;
    lineCap?: 'butt' | 'round' | 'square';
    duration?: number;
    maxValue?: number;
    value?: number;
    onValueChange?: (value: number) => void;
    style?: ViewStyle;
  }

  export default class CircularProgress extends Component<CircularProgressProps> {}
} 