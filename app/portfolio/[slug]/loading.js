// app/portfolio/[slug]/loading.js
import styles from './Portfolio.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      {/* Breadcrumbs skeleton */}
      <div className={styles.breadcrumbs}>
        <div className={styles.skeletonBreadcrumb}></div>
        <span className={styles.breadcrumbSeparator}>/</span>
        <div className={styles.skeletonBreadcrumb}></div>
      </div>

      {/* Header skeleton */}
      <div className={styles.headerSkeleton}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonDescription}></div>
        <div className={styles.skeletonDescription} style={{ width: '60%' }}></div>
      </div>

      {/* Sub-portfolios skeleton */}
      <div className={styles.subPortfolioList}>
        <div className={styles.portfolioGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.portfolioCard}>
              <div className={styles.skeletonPortfolioImage}></div>
              <div className={styles.skeletonPortfolioTitle}></div>
              <div className={styles.skeletonPortfolioDesc}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}