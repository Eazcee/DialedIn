import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Dimensions,
  Alert
} from 'react-native';
import { colors } from '../config/colors';
import { Video, ResizeMode } from 'expo-av';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  video_url: string;
}

interface MuscleGroupExercises {
  primary: Exercise;
  alternatives: Exercise[];
}

interface MuscleGroupExerciseProps {
  muscleGroup: string;
  exercises: MuscleGroupExercises;
  onComplete: () => void;
}

export default function MuscleGroupExercise({ 
  muscleGroup, 
  exercises, 
  onComplete 
}: MuscleGroupExerciseProps) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>(exercises.primary);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(3); // Set default to 3 seconds for demo
  const videoRef = useRef<Video>(null);

  // Update rest time when exercise changes
  useEffect(() => {
    setRestTimeLeft(3); // Always use 3 seconds for demo
  }, [selectedExercise]);

  const handleSetComplete = () => {
    if (currentSet < selectedExercise.sets) {
      setCurrentSet(prev => prev + 1);
      setIsResting(true);
      setRestTimeLeft(3); // Always use 3 seconds for demo
      
      // Start rest timer
      const timer = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // All sets completed
      onComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const openVideo = async () => {
    try {
      await Linking.openURL(selectedExercise.video_url);
    } catch (error) {
      console.error('Error opening video URL:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.muscleGroupTitle}>{muscleGroup}</Text>
      
      <View style={styles.exerciseContainer}>
        <Text style={styles.exerciseName}>{selectedExercise.name}</Text>
        <Text style={styles.exerciseDetails}>
          {selectedExercise.sets} sets × {selectedExercise.reps} reps
        </Text>
        
        <View style={styles.videoContainer}>
          {selectedExercise.video_url && selectedExercise.video_url !== 'video_placeholder' ? (
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRef}
                style={styles.video}
                source={{ uri: selectedExercise.video_url }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={false}
                onError={(error) => {
                  console.error('Video playback error:', error);
                  Alert.alert(
                    "Video Error",
                    "Unable to play the video. Please try again later.",
                    [{ text: "OK" }]
                  );
                }}
                onLoad={(status) => {
                  console.log('Video loaded:', status);
                  if (videoRef.current) {
                    videoRef.current.playAsync().catch(error => {
                      console.error('Error playing video:', error);
                      Alert.alert(
                        "Playback Error",
                        "Unable to start video playback. Please try again.",
                        [{ text: "OK" }]
                      );
                    });
                  }
                }}
              />
              <View style={styles.videoOverlay} />
            </View>
          ) : (
            <View style={styles.noVideoContainer}>
              <Text style={styles.noVideoText}>Video tutorial not available</Text>
              <Text style={styles.noVideoSubtext}>Please refer to exercise instructions</Text>
              <TouchableOpacity 
                style={styles.openVideoButton}
                onPress={openVideo}
              >
                <Text style={styles.openVideoButtonText}>Open Exercise Guide</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.setCounter}>
          <Text style={styles.setCounterText}>
            Set {currentSet} of {selectedExercise.sets}
          </Text>
        </View>
        
        {isResting ? (
          <View style={styles.restContainer}>
            <Text style={styles.restText}>Rest Time</Text>
            <Text style={styles.timerText}>{formatTime(restTimeLeft)}</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.completeSetButton}
            onPress={handleSetComplete}
          >
            <Text style={styles.completeSetButtonText}>Complete Set</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.alternativesContainer}>
        <Text style={styles.alternativesTitle}>Alternative Exercises</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {exercises.alternatives.map((exercise, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.alternativeButton,
                selectedExercise.name === exercise.name && styles.selectedAlternative
              ]}
              onPress={() => {
                setSelectedExercise(exercise);
                setCurrentSet(1);
                setIsResting(false);
                setRestTimeLeft(exercise.rest_time_seconds);
              }}
            >
              <Text style={styles.alternativeButtonText}>{exercise.name}</Text>
              <Text style={styles.alternativeDetails}>
                {exercise.sets}×{exercise.reps}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  muscleGroupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  exerciseContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  exerciseDetails: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 15,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  setCounter: {
    marginBottom: 20,
  },
  setCounterText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  restContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  restText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  completeSetButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  completeSetButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  alternativesContainer: {
    marginTop: 20,
  },
  alternativesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
  },
  alternativeButton: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  selectedAlternative: {
    backgroundColor: colors.primary,
  },
  alternativeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  alternativeDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  noVideoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  noVideoSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  openVideoButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  openVideoButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 