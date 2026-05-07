import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState('barcode'); // 'barcode' or 'photo'
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    Alert.alert(
      'Barcode Scanned!',
      `Type: ${type}\nData: ${data}`,
      [
        {
          text: 'Scan Again',
          onPress: () => setScanned(false)
        },
        {
          text: 'Add Product',
          onPress: () => {
            // Navigate to Add Product with barcode data
            navigation.navigate('AddProduct', { barcode: data });
          }
        }
      ]
    );
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo.uri);
        
        // Here you would implement OCR to extract text/prices
        Alert.alert(
          'Photo Captured!',
          'OCR feature coming soon. For now, please add product details manually.',
          [
            {
              text: 'Retake',
              onPress: () => setCapturedImage(null)
            },
            {
              text: 'Add Product',
              onPress: () => navigation.navigate('AddProduct')
            }
          ]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
        <View style={styles.imageActions}>
          <TouchableOpacity 
            style={[styles.button, styles.retakeButton]}
            onPress={() => setCapturedImage(null)}
          >
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.useButton]}
            onPress={() => navigation.navigate('AddProduct')}
          >
            <Ionicons name="checkmark-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'barcode' && styles.activeModeButton]}
          onPress={() => setMode('barcode')}
        >
          <Ionicons name="barcode-outline" size={20} color={mode === 'barcode' ? '#fff' : '#800000'} />
          <Text style={[styles.modeText, mode === 'barcode' && styles.activeModeText]}>
            Barcode
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'photo' && styles.activeModeButton]}
          onPress={() => setMode('photo')}
        >
          <Ionicons name="camera-outline" size={20} color={mode === 'photo' ? '#fff' : '#800000'} />
          <Text style={[styles.modeText, mode === 'photo' && styles.activeModeText]}>
            Photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      {mode === 'barcode' ? (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.camera}
        />
      ) : (
        <Camera
          style={styles.camera}
          ref={cameraRef}
          type={Camera.Constants.Type.back}
        />
      )}

      {/* Overlay Instructions */}
      <View style={styles.overlay}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {mode === 'barcode' 
              ? 'Point camera at barcode to scan' 
              : 'Point camera at product or price tag'
            }
          </Text>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanFrame} />

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {mode === 'barcode' ? (
            <TouchableOpacity 
              style={[styles.actionButton, scanned && styles.disabledButton]}
              onPress={() => setScanned(false)}
              disabled={!scanned}
            >
              <Ionicons name="refresh-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>
                {scanned ? 'Scanned!' : 'Scanning...'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={takePicture}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Capture</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 25,
    padding: 5,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  activeModeButton: {
    backgroundColor: '#800000',
  },
  modeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#800000',
  },
  activeModeText: {
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#800000',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  actionContainer: {
    marginBottom: 50,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#800000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  disabledButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  capturedImage: {
    flex: 1,
    width: '100%',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
  },
  retakeButton: {
    backgroundColor: '#F44336',
  },
  useButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  text: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    margin: 20,
  },
});