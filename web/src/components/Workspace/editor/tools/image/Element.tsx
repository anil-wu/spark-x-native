import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { ElementWrapper, BaseElementProps } from '../ElementWrapper';

interface ImageElementProps extends BaseElementProps {
  src?: string;
}

export default function ImageElement(props: ImageElementProps) {
  // Use a local placeholder image to avoid network issues if src is missing
  const imageUrl = props.src || '/role.png';
  const [img] = useImage(imageUrl, 'anonymous');

  return (
    <ElementWrapper {...props}>
      <KonvaImage
        image={img}
        width={props.width}
        height={props.height}
      />
    </ElementWrapper>
  );
}
