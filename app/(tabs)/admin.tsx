import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

interface GroupedReport {
  listingId: string;
  listingTitle: string;
  listingOwnerName: string;
  reportCount: number;
  latestReportedAt: string;
  reasons: string[];
}

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminScreen() {
  const { user, users } = useAuth();
  const { reports, auditLog, deleteListingAsAdmin } = useData();

  const groupedReportedListings = useMemo(() => {
    const grouped = reports
      .filter((report) => report.status === "OPEN")
      .reduce<Record<string, GroupedReport>>((accumulator, report) => {
        const existing = accumulator[report.listingId];

        if (!existing) {
          accumulator[report.listingId] = {
            listingId: report.listingId,
            listingTitle: report.listingTitle,
            listingOwnerName: report.listingOwnerName,
            reportCount: 1,
            latestReportedAt: report.createdAt,
            reasons: [report.reason],
          };
          return accumulator;
        }

        const reasons = existing.reasons.includes(report.reason)
          ? existing.reasons
          : [...existing.reasons, report.reason];

        accumulator[report.listingId] = {
          ...existing,
          reportCount: existing.reportCount + 1,
          latestReportedAt:
            report.createdAt > existing.latestReportedAt
              ? report.createdAt
              : existing.latestReportedAt,
          reasons,
        };

        return accumulator;
      }, {});

    return Object.values(grouped).sort((left, right) =>
      right.latestReportedAt.localeCompare(left.latestReportedAt)
    );
  }, [reports]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === "ADMIN" ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      }),
    [users]
  );

  if (!user || user.role !== "ADMIN") {
    return (
      <View style={styles.noAccessContainer}>
        <Ionicons name="lock-closed-outline" size={54} color="#c62828" />
        <Text style={styles.noAccessTitle}>Admin Access Required</Text>
        <Text style={styles.noAccessText}>
          This screen is only visible to users with the Admin role.
        </Text>
      </View>
    );
  }

  const handleDeleteListing = (listingId: string, listingTitle: string) => {
    Alert.alert(
      "Delete listing",
      `Delete \"${listingTitle}\"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteListingAsAdmin(listingId, user.id, user.name),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <Text style={styles.subHeader}>Moderation and audit controls</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reported Listings</Text>
        {groupedReportedListings.length > 0 ? (
          groupedReportedListings.map((reportedListing) => (
            <View key={reportedListing.listingId} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>{reportedListing.listingTitle}</Text>
                  <Text style={styles.cardMeta}>Owner: {reportedListing.listingOwnerName}</Text>
                </View>
                <View style={styles.reportCountPill}>
                  <Text style={styles.reportCountText}>{reportedListing.reportCount} report(s)</Text>
                </View>
              </View>

              <Text style={styles.cardMeta}>Latest: {formatDate(reportedListing.latestReportedAt)}</Text>

              <View style={styles.reasonList}>
                {reportedListing.reasons.slice(0, 3).map((reason) => (
                  <Text key={`${reportedListing.listingId}-${reason}`} style={styles.reasonItem}>
                    - {reason}
                  </Text>
                ))}
              </View>

              <Pressable
                style={styles.deleteButton}
                onPress={() =>
                  handleDeleteListing(reportedListing.listingId, reportedListing.listingTitle)
                }>
                <Ionicons name="trash-outline" size={18} color="white" />
                <Text style={styles.deleteButtonText}>Delete Listing</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No open reports</Text>
            <Text style={styles.emptyCardText}>Reported listings will appear here for moderation.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audit Log</Text>
        {auditLog.length > 0 ? (
          auditLog.map((entry) => (
            <View key={entry.id} style={styles.auditRow}>
              <View style={styles.auditIconWrap}>
                <Ionicons
                  name={entry.action === "DELETE_LISTING" ? "trash" : "flag"}
                  size={16}
                  color={entry.action === "DELETE_LISTING" ? "#c62828" : "#ef6c00"}
                />
              </View>
              <View style={styles.auditCopy}>
                <Text style={styles.auditTitle}>{entry.action.replace("_", " ")}</Text>
                <Text style={styles.auditDetails}>{entry.details}</Text>
                <Text style={styles.auditMeta}>
                  {entry.actorName} • {formatDate(entry.createdAt)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No audit events</Text>
            <Text style={styles.emptyCardText}>Actions like reporting and deletion are logged here.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Users and Roles</Text>
        {sortedUsers.map((knownUser) => (
          <View key={knownUser.id} style={styles.userRow}>
            <View>
              <Text style={styles.userName}>{knownUser.name}</Text>
              <Text style={styles.userEmail}>{knownUser.email}</Text>
            </View>
            <View
              style={[
                styles.roleBadge,
                knownUser.role === "ADMIN" ? styles.roleAdmin : styles.roleStudent,
              ]}>
              <Text
                style={[
                  styles.roleBadgeText,
                  knownUser.role === "ADMIN"
                    ? styles.roleAdminText
                    : styles.roleStudentText,
                ]}>
                {knownUser.role}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    color: "#222",
  },
  subHeader: {
    color: "#666",
    marginTop: -6,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  cardMeta: {
    color: "#666",
  },
  reportCountPill: {
    alignSelf: "flex-start",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reportCountText: {
    color: "#ef6c00",
    fontSize: 12,
    fontWeight: "700",
  },
  reasonList: {
    gap: 4,
  },
  reasonItem: {
    color: "#555",
  },
  deleteButton: {
    marginTop: 6,
    backgroundColor: "#c62828",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "700",
  },
  auditRow: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  auditIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
  },
  auditCopy: {
    flex: 1,
    gap: 4,
  },
  auditTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
    letterSpacing: 0.3,
  },
  auditDetails: {
    color: "#444",
    lineHeight: 20,
  },
  auditMeta: {
    color: "#888",
    fontSize: 12,
  },
  userRow: {
    backgroundColor: "white",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  userEmail: {
    color: "#666",
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  roleAdmin: {
    backgroundColor: "#fdecea",
  },
  roleStudent: {
    backgroundColor: "#e3f2fd",
  },
  roleAdminText: {
    color: "#c62828",
  },
  roleStudentText: {
    color: "#1565c0",
  },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  emptyCardText: {
    color: "#666",
  },
  noAccessContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 24,
  },
  noAccessTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
  },
  noAccessText: {
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
  },
});
