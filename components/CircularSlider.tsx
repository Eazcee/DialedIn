import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  PanResponder, 
  Dimensions,
  Text as RNText
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../styles/colors';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const STROKE_WIDTH = 8;
const TRACK_RADIUS = CIRCLE_RADIUS - STROKE_WIDTH / 2;
const RIDGE_COUNT = 60;
const POINTER_RADIUS = 8;
const ACTIVE_COLOR = colors.primary;
const INACTIVE_COLOR = colors.text.secondary;

interface CircularSliderProps {
  value: number;
  maxValue: number;
  onValueChange: (value: number) => void;
  stepSize?: number;
  label?: string;
}

export default function CircularSlider({ 
  value, 
  maxValue, 
  onValueChange,
  stepSize = 5,
  label = 'MINUTES'
}: CircularSliderProps) {
  const [angle, setAngle] = useState(0);
  
  const getAngleFromValue = (value: number) => {
    return ((value - 10) / (maxValue - 10)) * 360;
  };

  const getValueFromAngle = (angle: number) => {
    const value = (angle / 360) * (maxValue - 10) + 10;
    return Math.round(value / stepSize) * stepSize;
  };

  useEffect(() => {
    setAngle(getAngleFromValue(value));
  }, [value]);
  
  const dashes = [];
  for (let i = 0; i < RIDGE_COUNT; i++) {
    const dashAngle = (i / RIDGE_COUNT) * 360;
    const isActive = dashAngle <= angle;
    const startX = CIRCLE_RADIUS + (TRACK_RADIUS - 2) * Math.cos((dashAngle - 90) * Math.PI / 180);
    const startY = CIRCLE_RADIUS + (TRACK_RADIUS - 2) * Math.sin((dashAngle - 90) * Math.PI / 180);
    const endX = CIRCLE_RADIUS + (TRACK_RADIUS + 2) * Math.cos((dashAngle - 90) * Math.PI / 180);
    const endY = CIRCLE_RADIUS + (TRACK_RADIUS + 2) * Math.sin((dashAngle - 90) * Math.PI / 180);
    
    dashes.push(
      <Line
        key={`dash-${i}`}
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        strokeWidth={2}
      />
    );
  }
  
  const pointerX = CIRCLE_RADIUS + TRACK_RADIUS * Math.cos((angle - 90) * Math.PI / 180);
  const pointerY = CIRCLE_RADIUS + TRACK_RADIUS * Math.sin((angle - 90) * Math.PI / 180);
  
  const getAngleFromTouch = (x: number, y: number) => {
    // Calculate the angle from the center of the circle
    const centerX = CIRCLE_RADIUS;
    const centerY = CIRCLE_RADIUS;
    
    // Calculate the angle in radians
    let angle = Math.atan2(y - centerY, x - centerX);
    
    // Convert to degrees and adjust to start from top (90 degrees)
    angle = (angle * 180 / Math.PI) + 90;
    
    // Normalize angle to be between 0 and 360
    if (angle < 0) {
      angle += 360;
    }
    
    return angle;
  };
  
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gestureState) => {
      const { x0, y0 } = gestureState;
      const newAngle = getAngleFromTouch(x0, y0);
      setAngle(newAngle);
      onValueChange(getValueFromAngle(newAngle));
    },
    onPanResponderMove: (_, gestureState) => {
      const { moveX, moveY } = gestureState;
      const newAngle = getAngleFromTouch(moveX, moveY);
      setAngle(newAngle);
      onValueChange(getValueFromAngle(newAngle));
    }
  });
  
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        {dashes}
        <Circle
          cx={pointerX}
          cy={pointerY}
          r={POINTER_RADIUS}
          fill={ACTIVE_COLOR}
        />
      </Svg>
      <View style={styles.timeContainer}>
        <RNText style={styles.timeValue}>{value}</RNText>
        <RNText style={styles.timeLabel}>{label}</RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: ACTIVE_COLOR,
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: ACTIVE_COLOR,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: -4,
  }
}); 