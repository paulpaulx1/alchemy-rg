export function getConnectionSpeed() {
  // Method 1: Network Information API (Chrome, Edge, some mobile browsers)
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink; // Mbps
      
      console.log('Connection info:', { effectiveType, downlink });
      
      // Classify connection speed
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
        return 'very-slow';
      } else if (effectiveType === '3g' || downlink < 1.5) {
        return 'slow';
      } else if (effectiveType === '4g' || downlink > 1.5) {
        return 'fast';
      }
    }
  }
  
  // Method 2: Device memory (rough indicator)
  if ('deviceMemory' in navigator) {
    const memory = navigator.deviceMemory;
    if (memory <= 2) {
      return 'slow'; // Low-end device, assume slower connection
    }
  }
  
  // Method 3: User Agent detection for known slow devices
  const userAgent = navigator.userAgent;
  if (/Android.*Chrome\/[1-5][0-9]\./.test(userAgent)) {
    return 'slow'; // Older Android Chrome versions
  }
  
  // Default: assume moderate speed
  return 'moderate';
}

// Generate optimized image URL based on connection speed
export function getOptimizedImageUrl(baseUrl, connectionSpeed, mediaType = 'image') {
  if (!baseUrl) return baseUrl;
  
  // Remove existing query parameters to avoid conflicts
  const cleanUrl = baseUrl.split('?')[0];
  
  let params;
  
  switch (connectionSpeed) {
    case 'very-slow':
      params = mediaType === 'video' 
        ? '?w=320&h=240&fit=crop&auto=format&q=40'
        : '?w=400&h=300&fit=crop&auto=format&q=50';
      break;
      
    case 'slow':
      params = mediaType === 'video'
        ? '?w=480&h=360&fit=crop&auto=format&q=60'
        : '?w=600&h=450&fit=crop&auto=format&q=70';
      break;
      
    case 'moderate':
      params = mediaType === 'video'
        ? '?w=640&h=480&fit=crop&auto=format&q=75'
        : '?w=800&h=600&fit=crop&auto=format&q=80';
      break;
      
    case 'fast':
    default:
      params = mediaType === 'video'
        ? '?w=1280&h=720&fit=crop&auto=format&q=85'
        : '?w=1200&h=800&fit=crop&auto=format&q=85';
      break;
  }
  
  return cleanUrl + params;
}

// React hook for connection-aware image loading
export function useConnectionAwareImages() {
  const [connectionSpeed, setConnectionSpeed] = useState('moderate');
  
  useEffect(() => {
    const speed = getConnectionSpeed();
    setConnectionSpeed(speed);
    
    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const updateConnection = () => {
        const newSpeed = getConnectionSpeed();
        setConnectionSpeed(newSpeed);
      };
      
      connection.addEventListener('change', updateConnection);
      return () => connection.removeEventListener('change', updateConnection);
    }
  }, []);
  
  return {
    connectionSpeed,
    getOptimizedUrl: (url, mediaType) => getOptimizedImageUrl(url, connectionSpeed, mediaType)
  };
}

// Performance timing based detection (fallback method)
export function measurePageLoadSpeed() {
  if ('performance' in window && 'timing' in performance) {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    // Classify based on load time
    if (loadTime > 5000) {
      return 'very-slow';
    } else if (loadTime > 3000) {
      return 'slow';
    } else if (loadTime > 1500) {
      return 'moderate';
    } else {
      return 'fast';
    }
  }
  
  return 'moderate';
}