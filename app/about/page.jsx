import { client } from "@/lib/client";
import { PortableText } from "@portabletext/react";
import Link from "next/link";
import styles from "./About.module.css";
import ImageSection from "./ImageSection"; // We'll create this as a separate client component

export default async function AboutPage() {
  const artist = await client.fetch(`
    *[_type == "artist"][0] {
      name,
      "profileImageUrl": profileImage.asset->url,
      "additionalImages": additionalImages[]{
        "url": asset->url,
        alt
      },
      bio,
      email,
      website,
      socialMedia,
      "cvUrl": cv.asset->url
    }
  `);

  const portableTextComponents = {
    block: {
      normal: ({children}) => <p className={styles.bioParagraph}>{children}</p>,
    },
    list: {
      bullet: ({ children }) => (
        <ul className={styles.bioList}>
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className={styles.bioList}>
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }) => (
        <li className={styles.bioListItem}>
          {children}
        </li>
      ),
      number: ({ children }) => (
        <li className={styles.bioListItem}>
          {children}
        </li>
      ),
    },
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <ImageSection 
          mainImage={artist.profileImageUrl}
          additionalImages={artist.additionalImages}
          artistName={artist.name}
        />

        <div className={styles.bioContainer}>
          {artist.bio && (
            <div className={styles.bio}>
              <PortableText
                value={artist.bio}
                components={portableTextComponents}
              />
            </div>
          )}

          <div className={styles.contactInfo}>
            {artist.email && (
              <p>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${artist.email}`}>{artist.email}</a>
              </p>
            )}

            {artist.website && (
              <p>
                <strong>Website:</strong>{" "}
                <a
                  href={artist.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {artist.website}
                </a>
              </p>
            )}

            {artist.socialMedia && (
              <div className={styles.socialLinks}>
                {artist.socialMedia.instagram && (
                  <a
                    href={artist.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram
                  </a>
                )}
                {artist.socialMedia.twitter && (
                  <a
                    href={artist.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Twitter
                  </a>
                )}
                {artist.socialMedia.facebook && (
                  <a
                    href={artist.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Facebook
                  </a>
                )}
                {artist.socialMedia.linkedin && (
                  <a
                    href={artist.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                )}
                {artist.socialMedia.youtube && (
                  <a
                    href={artist.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    YouTube
                  </a>
                )}
              </div>
            )}

            {artist.cvUrl && (
              <p>
                <a
                  href={artist.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cvLink}
                >
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

export const revalidate = 60;