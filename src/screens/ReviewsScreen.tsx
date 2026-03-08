import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { StarRatingInput } from 'react-native-star-rating-widget';

const ReviewsScreen = () => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // This is where you'll eventually call POST /api/reviews
    Alert.alert("Review Submitted", `Rating: ${rating}\nComment: ${comment}`);
    // Reset fields after submission
    setRating(0);
    setComment('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Rate your Experience</Text>
      
      <StarRatingInput
        rating={rating}
        onChange={setRating}
        maxStars={5}
        starSize={40}
        color="#D4AF37" // Gold color for stars
      />

      <TextInput
        style={styles.input}
        placeholder="Write a review (optional)..."
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Button 
        title="Submit Review" 
        onPress={handleSubmit} 
        disabled={rating === 0} // Prevent submission without a star rating
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { 
    width: '100%', 
    height: 100, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 10, 
    marginTop: 20, 
    marginBottom: 20,
    textAlignVertical: 'top' 
  },
});

export default ReviewsScreen;