import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock data to visualize the dashboard before the API is linked
const MOCK_REPORTS = [
  { id: '1', title: 'Calculated Risk Textbook', reason: 'Inappropriate image' },
  { id: '2', title: 'Math Tutoring', reason: 'Spam' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('Reports');

  const renderReportItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDetail}>Reason: {item.reason}</Text>
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => Alert.alert("Delete", `Delete listing ${item.id}?`)}
      >
        <Text style={styles.buttonText}>Delete Listing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Control Center</Text>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['Reports', 'Users', 'Audit Log'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={activeTab === tab ? styles.activeTabText : styles.tabText}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on Active Tab */}
      {activeTab === 'Reports' ? (
        <FlatList 
          data={MOCK_REPORTS} 
          renderItem={renderReportItem} 
          keyExtractor={item => item.id} 
        />
      ) : (
        <View style={styles.placeholder}>
          <Text>The {activeTab} list will be wired to the Azure API next.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#CC0633', marginBottom: 20, textAlign: 'center' }, // Using SAIT Red
  tabContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  tab: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#ddd' },
  activeTab: { backgroundColor: '#CC0633' },
  tabText: { color: '#333' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardDetail: { color: '#666', marginVertical: 5 },
  deleteButton: { backgroundColor: '#ff4444', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});

export default AdminDashboard;

