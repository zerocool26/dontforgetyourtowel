import type { ImageMetadata } from 'astro';

import fogAerial from '../assets/chicago-fog-aerial-venti-views.jpg';
import loopTrain from '../assets/chicago-loop-train-juan-pablo-valdivia.jpg';
import riverwalkSunset from '../assets/chicago-riverwalk-sunset-max-bender.jpg';

export type EditorialMediaKey = 'riverwalk' | 'loop' | 'fog';

interface EditorialMedia {
  src: ImageMetadata;
  alt: string;
  caption: string;
  position: string;
}

export const editorialMedia: Record<EditorialMediaKey, EditorialMedia> = {
  riverwalk: {
    src: riverwalkSunset,
    alt: 'Chicago Riverwalk and downtown towers catching the last light of day',
    caption: 'Chicago / decisions in context',
    position: '54% center',
  },
  loop: {
    src: loopTrain,
    alt: 'A Chicago L train moving through the downtown Loop between city buildings',
    caption: 'Chicago / systems in motion',
    position: '52% center',
  },
  fog: {
    src: fogAerial,
    alt: 'Downtown Chicago glowing through low fog above the river at night',
    caption: 'Chicago / operations after dark',
    position: '56% center',
  },
};

export const localServiceMedia: EditorialMediaKey[] = [
  'riverwalk',
  'loop',
  'fog',
];
