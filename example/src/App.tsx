import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DiagnosticsOverlay } from 'react-native-diagnostics';

// Stand-in for your app's own screens. The only line the library needs is
// <DiagnosticsOverlay /> at the root, after everything else.
export default function App() {
  return (
    <View style={styles.app}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your app</Text>
        <Text style={styles.subtitle}>
          The diagnostics overlay floats on top of every screen. Drag it
          anywhere, or tap its header to shrink it.
        </Text>
        {CARDS.map((card) => (
          <View
            key={card.title}
            style={[styles.card, { backgroundColor: card.color }]}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardBody}>{card.body}</Text>
          </View>
        ))}
      </ScrollView>

      <DiagnosticsOverlay enabled={__DEV__} />
    </View>
  );
}

const CARDS = [
  { title: 'Orders', body: '12 new today', color: '#4F46E5' },
  { title: 'Revenue', body: '$4,320 this week', color: '#0EA5E9' },
  { title: 'Customers', body: '842 active', color: '#10B981' },
  { title: 'Messages', body: '3 unread', color: '#F59E0B' },
  { title: 'Reviews', body: '4.8 average', color: '#EF4444' },
  { title: 'Inventory', body: '27 items low', color: '#8B5CF6' },
];

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  content: {
    padding: 16,
    paddingTop:
      (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 54) + 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 15,
    lineHeight: 21,
    color: '#4B5563',
  },
  card: {
    height: 120,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  cardBody: {
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
  },
});
