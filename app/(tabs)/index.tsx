import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Listing, useData } from "../../context/DataContext";

export default function HomeScreen() {
  const { listings } = useData();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'OFFER' | 'REQUEST'>('OFFER');
  const router = useRouter();

  const filteredListings = listings.filter(l => l.type === filter);

  const renderItem = ({ item }: { item: Listing }) => (
    <Link href={`/listing/${item.id}`} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.badge, item.type === 'OFFER' ? styles.offerBadge : styles.requestBadge]}>
            {item.type}
          </Text>
          <Text style={styles.credits}>{item.credits} Credits</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.userRow}>
          <Ionicons name="person-circle-outline" size={20} color="#666" />
          <Text style={styles.userName}>{item.userName}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Barter</Text>
        <View style={styles.creditsContainer}>
          <Text style={styles.userCredits}>{user?.credits || 0} ⌛</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, filter === 'OFFER' && styles.activeTab]}
          onPress={() => setFilter('OFFER')}
        >
          <Text style={[styles.tabText, filter === 'OFFER' && styles.activeTabText]}>Offers</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filter === 'REQUEST' && styles.activeTab]}
          onPress={() => setFilter('REQUEST')}
        >
          <Text style={[styles.tabText, filter === 'REQUEST' && styles.activeTabText]}>Requests</Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={filteredListings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No listings found.</Text>}
      />

      {/* FAB */}
      <Link href="/listing/create" asChild>
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50, // Safe area top
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  creditsContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
  },
  userCredits: {
    fontWeight: "bold",
    fontSize: 16,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  activeTab: {
    backgroundColor: "#d32f2f", // SAIT Red
    borderColor: "#d32f2f",
  },
  tabText: {
    color: "#666",
    fontWeight: "600",
  },
  activeTabText: {
    color: "white",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  offerBadge: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
  },
  requestBadge: {
    backgroundColor: "#fbe4ec",
    color: "#c2185b",
  },
  credits: {
    fontWeight: "bold",
    color: "#f57c00",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  description: {
    color: "#666",
    marginBottom: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 12,
    color: "#999",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#999",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#d32f2f",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
