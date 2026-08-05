interface Props {
  title: string;
  excerpt?: string;
  coverImage?: string;
  publishDate: Date;
  href: string;
}

export default function ArticleTeaser({
  title,
  excerpt,
  coverImage,
  publishDate,
  href,
}: Props) {
  return (
    <div className="card card-plain mb-4">
      <a href={href} className="d-flex align-items-start text-dark">
        {(coverImage) &&
          <img
            className="max-height-150 rounded-2 me-4"
            src={`${import.meta.env.BASE_URL}${coverImage.replace(/^\//, '')}`}
            alt={title}
          />
        }
        <div>
          <h5 className="mb-1">{title}</h5>
          <p className="text-body text-sm mb-2">
            {publishDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {(excerpt) &&
            <p className="text-body">{excerpt}</p>
          }
        </div>
      </a>
    </div>
  );
}
