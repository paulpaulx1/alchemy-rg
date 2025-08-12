
// pages/youtube-test.js (or app/youtube-test/page.js for App Router)

export default function YouTubeTest() {
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
        YouTube Embed Branding Test
      </h1>
      
      <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
        This shows how YouTube embeds look with standard embedding (branding visible)
      </p>
      
      {/* Standard YouTube embed */}
      <div style={{ 
        position: 'relative', 
        paddingBottom: '56.25%', 
        height: 0, 
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <iframe
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          src="https://www.youtube.com/embed/34glwxP8phM?playsinline=1&rel=0&modestbranding=1&controls=1"
         title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>

      </div>
      
      <p style={{ 
        textAlign: 'center', 
        marginTop: '2rem', 
        fontSize: '0.9rem', 
        color: '#666' 
      }}>
        Note: This is an unlisted video - only people with the link can find it
      </p>
    </div>
  )
}