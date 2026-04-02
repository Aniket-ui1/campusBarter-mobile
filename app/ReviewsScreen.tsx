import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
// We changed the import below to be simpler and more "web-friendly"
import StarRating from 'react-native-star-rating-widget';

const ReviewsScreen = () => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // This mocks the POST /api/reviews task in your roadmap [cite: 52]
    Alert.alert("Review Submitted", `Rating: ${rating}\nComment: ${comment}`);
    setRating(0);
    setComment('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Rate your Experience</Text>
      
      {/* We are using the default 'StarRating' component here now */}
      <StarRating
        rating={rating}
        onChange={setRating}
        maxStars={5}
        starSize={40}
        color="#CC0633" // SAIT Red to match your Admin Dashboard [cite: 116]
      />

      <TextInput
        style={styles.input}
        placeholder="How was the exchange? (Optional)"
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Button 
        title="Submit Review" 
        onPress={handleSubmit} 
        disabled={rating === 0} 
        color="#CC0633"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
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