import re
import time
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from models.requests import ProcessRequest
from models.responses import ProcessResponse, ExtractedSignal

# Keyword patterns for signal type classification
PAIN_POINT_PATTERNS = [
    r'\b(frustrated|frustrating|annoying|terrible|awful|hate|sucks?|broken|painful|struggle|struggling)\b',
    r'\b(too expensive|overpriced|costs? too much|pricing issue|raises? prices?)\b',
    r'\b(no good|not good|can\'?t find|doesn\'?t (work|exist)|lack(s|ing)?|missing)\b',
    r'\b(problem(s|atic)?|issue(s)?|bug(s|gy)?|slow|bloated|clunky|confusing)\b',
    r'\b(wish there was|need(s)? a|looking for|want(s|ed)? a|someone should build)\b',
    r'\b(bad (experience|ux|ui)|poor quality|low quality|cheap|breaks?|broke|snapped|leaked?)\b',
]

FEATURE_REQUEST_PATTERNS = [
    r'\b(need(s|ed)?|want(s|ed)?|wish|would (love|like|be nice))\b.*\b(feature|tool|option|support|integration)\b',
    r'\b(should (have|support|add|include)|please add|feature request)\b',
    r'\b(alternative(s)?|replacement|substitute|instead of|better than)\b',
    r'\b(affordable|cheaper|budget|free|open.?source)\b.*\b(alternative|option|tool)\b',
    r'\b(comparison|vs\.?|versus|compared to)\b',
]

COMPETITOR_PATTERNS = [
    r'\b(asana|monday|clickup|notion|slack|jira|trello|linear)\b',
    r'\b(intercom|zendesk|hubspot|salesforce|mailchimp|convertkit)\b',
    r'\b(stripe|lemlist|calendly|buffer|hootsuite|webflow|framer)\b',
    r'\b(aws|azure|gcp|vercel|netlify|heroku|supabase|firebase)\b',
    r'\b(react|vue|angular|nextjs|svelte|tailwind|prisma)\b',
    r'\b(openai|anthropic|claude|chatgpt|gemini|llama|mistral)\b',
    r'\b(competitor|competing|competes? with|market leader|incumbent)\b',
]

TREND_PATTERNS = [
    r'\b(trend(s|ing)?|growing|growth|rising|emerging|popular|boom(ing)?|surge)\b',
    r'\b(market opportunity|market gap|untapped|underserved|niche)\b',
    r'\b(everyone is|people are|more and more|increasingly)\b',
    r'\b(new (tool|app|platform|framework|library|product|startup))\b',
    r'\b(launch(ed|ing)?|release(d)?|announce(d|ment)?|just (shipped|launched|released))\b',
    r'\b(ai|artificial intelligence|machine learning|ml|llm|generat(ive|ed))\b',
]


def _count_pattern_matches(text: str, patterns: list[str]) -> int:
    """Count how many pattern groups match in the text."""
    count = 0
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            count += 1
    return count


def _classify_signal_type(text: str) -> tuple[str, float]:
    """Classify text into a signal type with confidence score."""
    scores = {
        'pain_point': _count_pattern_matches(text, PAIN_POINT_PATTERNS),
        'feature_request': _count_pattern_matches(text, FEATURE_REQUEST_PATTERNS),
        'competitor_mention': _count_pattern_matches(text, COMPETITOR_PATTERNS),
        'trend': _count_pattern_matches(text, TREND_PATTERNS),
    }

    max_type = max(scores, key=scores.get)
    max_score = scores[max_type]
    total = sum(scores.values())

    if total == 0:
        return 'trend', 0.3  # Default with low confidence

    confidence = min(0.95, 0.4 + (max_score / len(PAIN_POINT_PATTERNS)) * 0.55)
    return max_type, round(confidence, 2)


def _extract_title(text: str, signal_type: str) -> str:
    """Extract a concise title from the text."""
    # Take the first sentence or first 80 chars
    sentences = re.split(r'[.!?\n]', text)
    first = sentences[0].strip() if sentences else text[:80]

    # Trim to reasonable length
    if len(first) > 80:
        first = first[:77] + '...'

    if not first:
        first = f"Signal: {signal_type.replace('_', ' ')}"

    return first


def _extract_content(text: str) -> str:
    """Extract the most relevant portion of text as signal content."""
    # Clean HTML tags
    clean = re.sub(r'<[^>]*>', '', text)
    # Collapse whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()

    if len(clean) > 300:
        return clean[:297] + '...'
    return clean


def _compute_momentum(text: str, metadata_hints: dict = None) -> float:
    """Estimate momentum score (0-100) from text signals."""
    score = 30.0  # Base score

    # Urgency indicators
    urgency_words = len(re.findall(
        r'\b(need|urgent|asap|immediately|critical|must|essential|desperate)\b',
        text, re.IGNORECASE
    ))
    score += min(urgency_words * 8, 25)

    # Community engagement (many people mentioning same thing)
    community_words = len(re.findall(
        r'\b(everyone|we all|many people|tons of|lots of|most|majority|community)\b',
        text, re.IGNORECASE
    ))
    score += min(community_words * 6, 15)

    # Market/money signals
    money_words = len(re.findall(
        r'\b(market|revenue|profit|pricing|subscription|saas|mrr|arr|paying|customer)\b',
        text, re.IGNORECASE
    ))
    score += min(money_words * 5, 20)

    # Negative sentiment (problems = opportunity)
    negative = len(re.findall(
        r'\b(hate|terrible|awful|broken|worst|useless|garbage|trash|horrible)\b',
        text, re.IGNORECASE
    ))
    score += min(negative * 5, 10)

    return round(min(score, 100), 1)


def process_texts(request: ProcessRequest) -> ProcessResponse:
    """Process raw texts and extract real signals using NLP."""
    start = time.time()
    signals = []

    if not request.texts:
        return ProcessResponse(
            source=request.source,
            signals=[],
            processing_time_ms=0,
        )

    # Build TF-IDF vectors for embedding generation
    vectorizer = TfidfVectorizer(
        max_features=384,
        stop_words='english',
        ngram_range=(1, 2),
        min_df=1,
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(request.texts)
    except ValueError:
        # If texts are too short/empty for TF-IDF
        tfidf_matrix = None

    for i, text in enumerate(request.texts):
        if not text or len(text.strip()) < 10:
            continue

        # Classify signal type
        signal_type, confidence = _classify_signal_type(text)

        # Extract title and content
        title = _extract_title(text, signal_type)
        content = _extract_content(text)

        # Generate embedding from TF-IDF
        if tfidf_matrix is not None and i < tfidf_matrix.shape[0]:
            raw_embedding = tfidf_matrix[i].toarray().flatten()
            # Pad or truncate to 384 dimensions
            if len(raw_embedding) < 384:
                embedding = np.pad(raw_embedding, (0, 384 - len(raw_embedding))).tolist()
            else:
                embedding = raw_embedding[:384].tolist()
        else:
            embedding = [0.0] * 384

        # Compute momentum
        momentum = _compute_momentum(text)

        # Compute mention count heuristic
        mention_count = max(1, len(re.findall(
            r'\b(I |we |our |my |people|users?|customers?|team)\b',
            text, re.IGNORECASE
        )))

        signals.append(
            ExtractedSignal(
                type=signal_type,
                title=title,
                content=content,
                confidence=confidence,
                momentum=momentum,
                mention_count=mention_count,
                embedding=embedding,
                metadata={
                    'source': request.source,
                    'text_length': len(text),
                    'keywords': _extract_keywords(text),
                },
            )
        )

    elapsed = (time.time() - start) * 1000

    return ProcessResponse(
        source=request.source,
        signals=signals,
        processing_time_ms=round(elapsed, 2),
    )


def _extract_keywords(text: str, max_keywords: int = 6) -> list[str]:
    """Extract key phrases from text."""
    # Simple approach: find noun-like bigrams
    clean = re.sub(r'<[^>]*>', '', text.lower())
    clean = re.sub(r'[^a-z\s]', '', clean)
    words = clean.split()

    # Filter stopwords
    stops = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
             'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
             'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
             'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
             'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
             'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
             'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
             'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
             'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because',
             'but', 'and', 'or', 'if', 'while', 'that', 'this', 'these', 'those',
             'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she',
             'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'dont', 'im',
             'every', 'also', 'still', 'about', 'like', 'get', 'got', 'much'}

    filtered = [w for w in words if w not in stops and len(w) > 2]

    # Count word frequency
    freq = {}
    for w in filtered:
        freq[w] = freq.get(w, 0) + 1

    # Return top keywords
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [w for w, c in sorted_words[:max_keywords]]
