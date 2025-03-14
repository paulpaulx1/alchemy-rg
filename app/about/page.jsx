// app/about/page.jsx
import { createClient } from '@sanity/client';
import Link from 'next/link';
import styles from './About.module.css';

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-03-01',
  useCdn: false, // For fresh data in SSR
});

// Helper function to extract plain text from blocks
function blocksToText(blocks) {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }
  
  return blocks
    .map(block => {
      if (block._type !== 'block' || !block.children) {
        return '';
      }
      return block.children.map(child => child.text).join('');
    })
    .join('\n\n');
}

export default async function AboutPage() {
  // Fetch artist data
  const artist = await client.fetch(`
    *[_type == "artist"][0] {
      name,
      "profileImageUrl": profileImage.asset->url,
      bio,
      email,
      website,
      socialMedia,
      "cvUrl": cv.asset->url
    }
  `);

  if (!artist) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Artist information not found</h1>
        <Link href="/" className={styles.link}>
          Return to home
        </Link>
      </div>
    );
  }

  // Convert the rich text to plain text paragraphs
  const bioText = blocksToText(artist.bio);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{artist.name}</h1>
      
      <div className={styles.content}>
        {artist.profileImageUrl && (
          <div className={styles.profileImage}>
            <img src={artist.profileImageUrl} alt={artist.name} />
          </div>
        )}
        
        <div className={styles.bioContainer}>
          {bioText && (
            <div className={styles.bio}>
              {bioText.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
          
          <div className={styles.contactInfo}>
            {artist.email && (
              <p>
                <strong>Email:</strong>{' '}
                <a href={`mailto:${artist.email}`}>{artist.email}</a>
              </p>
            )}
            
            {artist.website && (
              <p>
                <strong>Website:</strong>{' '}
                <a href={artist.website} target="_blank" rel="noopener noreferrer">
                  {artist.website}
                </a>
              </p>
            )}
            
            {artist.socialMedia && (
              <div className={styles.socialLinks}>
                {artist.socialMedia.instagram && (
                  <a href={artist.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                )}
                {artist.socialMedia.twitter && (
                  <a href={artist.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                    Twitter
                  </a>
                )}
                {artist.socialMedia.facebook && (
                  <a href={artist.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                    Facebook
                  </a>
                )}
                {artist.socialMedia.linkedin && (
                  <a href={artist.socialMedia.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
                {artist.socialMedia.youtube && (
                  <a href={artist.socialMedia.youtube} target="_blank" rel="noopener noreferrer">
                    YouTube
                  </a>
                )}
              </div>
            )}
            
            {artist.cvUrl && (
              <p>
                <a href={artist.cvUrl} target="_blank" rel="noopener noreferrer" className={styles.cvLink}>
                  Download CV/Resume
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enable ISR - updates the cache every 60 seconds
export const revalidate = 60;