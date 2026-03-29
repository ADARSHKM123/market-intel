import re
import time
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from models.requests import ClusterRequest
from models.responses import ClusterResponse, Cluster


# Category detection patterns
CATEGORY_PATTERNS = {
    'saas': [r'\b(saas|subscription|mrr|arr|recurring|b2b|platform|dashboard|analytics)\b',
             r'\b(email|crm|automation|workflow|integration|api)\b'],
    'tool': [r'\b(tool|app|extension|plugin|cli|sdk|library|framework|devtool)\b',
             r'\b(developer|coding|ide|editor|debug|testing|deploy)\b'],
    'physical': [r'\b(physical|hardware|device|material|ergonomic|fitness|gym|health)\b',
                 r'\b(product|manufacturing|shipping|inventory|ecommerce)\b'],
    'service': [r'\b(service|consulting|agency|freelanc|coaching|training|support)\b',
                r'\b(marketplace|hiring|outsourc|managed)\b'],
    'content': [r'\b(content|blog|newsletter|course|ebook|video|podcast|media)\b',
                r'\b(creator|influencer|audience|community|social)\b'],
}


def _detect_category(texts: list[str]) -> str:
    """Detect the category of a cluster from its texts."""
    combined = ' '.join(texts).lower()
    scores = {}

    for cat, patterns in CATEGORY_PATTERNS.items():
        score = 0
        for p in patterns:
            score += len(re.findall(p, combined, re.IGNORECASE))
        scores[cat] = score

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'tool'


def _generate_cluster_title(texts: list[str], vectorizer: TfidfVectorizer, cluster_center) -> tuple[str, str]:
    """Generate a descriptive title and description for a cluster."""
    feature_names = vectorizer.get_feature_names_out()

    # Get top terms from cluster center
    top_indices = cluster_center.argsort()[-8:][::-1]
    top_terms = [feature_names[i] for i in top_indices if cluster_center[i] > 0]

    if not top_terms:
        return "Emerging Opportunity", "A cluster of related signals"

    # Build title from top 3-4 terms
    title_terms = [t.title() for t in top_terms[:3]]
    title = ' & '.join(title_terms[:2])
    if len(title_terms) > 2:
        title += f' ({title_terms[2]})'

    # Build description from texts
    if texts:
        # Use the shortest text as a base for description
        sorted_texts = sorted(texts, key=len)
        base = sorted_texts[0][:150]
        description = f"Signals around {', '.join(top_terms[:4])}. {base}"
    else:
        description = f"Cluster of signals related to {', '.join(top_terms[:5])}"

    return title, description[:300]


def cluster_signals(request: ClusterRequest) -> ClusterResponse:
    """Cluster signals using TF-IDF + KMeans."""
    start = time.time()

    signal_ids = request.signal_ids
    texts = request.texts or []
    num_clusters = request.num_clusters or 5

    if not texts or len(texts) < 2:
        elapsed = (time.time() - start) * 1000
        return ClusterResponse(clusters=[], processing_time_ms=round(elapsed, 2))

    # Ensure we don't request more clusters than texts
    num_clusters = min(num_clusters, len(texts))

    # Build TF-IDF matrix
    vectorizer = TfidfVectorizer(
        max_features=500,
        stop_words='english',
        ngram_range=(1, 2),
        min_df=1,
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
    except ValueError:
        elapsed = (time.time() - start) * 1000
        return ClusterResponse(clusters=[], processing_time_ms=round(elapsed, 2))

    # KMeans clustering
    kmeans = KMeans(
        n_clusters=num_clusters,
        random_state=42,
        n_init=10,
        max_iter=300,
    )
    labels = kmeans.fit_predict(tfidf_matrix)

    # Build clusters
    clusters = []
    for i in range(num_clusters):
        cluster_mask = labels == i
        cluster_indices = np.where(cluster_mask)[0]

        if len(cluster_indices) == 0:
            continue

        cluster_signal_ids = [signal_ids[idx] for idx in cluster_indices if idx < len(signal_ids)]
        cluster_texts = [texts[idx] for idx in cluster_indices if idx < len(texts)]

        # Generate title and description
        title, description = _generate_cluster_title(
            cluster_texts, vectorizer, kmeans.cluster_centers_[i]
        )

        # Detect category
        category = _detect_category(cluster_texts)

        # Compute coherence (intra-cluster similarity)
        if len(cluster_indices) > 1:
            cluster_vectors = tfidf_matrix[cluster_mask].toarray()
            center = kmeans.cluster_centers_[i]
            similarities = []
            for vec in cluster_vectors:
                dot = np.dot(vec, center)
                norm = np.linalg.norm(vec) * np.linalg.norm(center)
                if norm > 0:
                    similarities.append(dot / norm)
            coherence = float(np.mean(similarities)) if similarities else 0.5
        else:
            coherence = 0.8

        clusters.append(Cluster(
            cluster_id=i,
            title=title,
            description=description,
            category=category,
            signal_ids=cluster_signal_ids,
            coherence_score=round(coherence, 2),
        ))

    elapsed = (time.time() - start) * 1000

    return ClusterResponse(
        clusters=clusters,
        processing_time_ms=round(elapsed, 2),
    )
