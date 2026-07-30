type ImageInput = string | { src: string; alt: string };

interface Props {
  images: ImageInput[];
}

export default function ProductGallery({
  images,
}: Props) {

  const normalized = images.map((img, i) =>
    typeof img === "string" ? { src: img, alt: `Product image ${i + 1}` } : img
  );

  if (normalized.length === 0) {
    return null;
  }

  return (
    <>
      <div className="col-12 col-lg-6 d-flex">
        <div className="d-block">
          {normalized.map((img, i) =>
            <img
              key={img.src}
              className={"w-90 max-height-150 rounded-2" + (i < normalized.length - 1 ? " mb-4" : "")}
              src={img.src}
              alt={img.alt}
            />
          )}
        </div>
        <img className="w-70 rounded-2" src={normalized[0].src} alt={normalized[0].alt} />
      </div>
    </>
  );
}