---
created: 2025-02-17T15:03:46 (UTC -08:00)
tags: []
source: https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/
author: 
---

# Audio Presentation with Accompanying Image — IIIF | International Image Interoperability Framework

> ## Excerpt
> IIIF is a set of open standards for delivering high-quality digital objects online at scale. It’s also the international community that makes it all work.

---
## Use Case

You have content you would like to provide to the user to enrich the presentation or experience of the main content. It could be something to experience before the user chooses to start interacting with the main content and/or something additional to consider while interacting with the main content. You might want to have an image available while an audio-only Canvas is playing or, conversely, audio available while a user is navigating an image-only Manifest.

## Implementation notes

Across a Manifest and its properties, you may use more than one `accompanyingCanvas`, allowing you to have an authentic `accompanyingCanvas` for each appropriate resource (Collection, Manifest, Canvas, and Range).

The `target` of the `Annotation` of an `accompanyingCanvas` should have as its value the `id` of the `accompanyingCanvas`, not the `id` of the resource that has the `accompanyingCanvas`.

Always keep in mind the wide latitude given conforming clients: It is up to the client whether and in what sort of UI to display content you place in a `accompanyingCanvas` property. Don’t use this property for content that must be displayed. On the other hand, placing content in a `accompanyingCanvas` does tell a client that the content, if displayed, should be displayed at the same time as the resource to which it is attached.

## Restrictions

Each instance of `accompanyingCanvas` may only contain one Canvas, and as such may specifically not contain an additional `accompanyingCanvas` or a `placeholderCanvas`.

## Example

In the example, the main Canvas contains audio of a performance of Gustav Mahler’s Symphony No. 3 and the `accompanyingCanvas` contains an image of a page from the score.

[JSON-LD](https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas//manifest.json) | [View in Clover](https://samvera-labs.github.io/clover-iiif/docs/viewer/demo?iiif-content=https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json) | [View in Aviary](https://iiif.aviaryplatform.com/player?manifest=https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json) | [View in Theseus](https://theseusviewer.org/?iiif-content=https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json)

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json",
  "type": "Manifest",
  "label": {
    "en": [
      "Partial audio recording of Gustav Mahler's _Symphony No. 3_"
    ]
  },
  "items": [
    {
      "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/p1",
      "type": "Canvas",
      "label": {
        "en": [
          "Gustav Mahler, Symphony No. 3, CD 1"
        ]
      },
      "duration": 1985.024,
      "accompanyingCanvas": {
        "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying",
        "type": "Canvas",
        "label": {
          "en": [
            "First page of score for Gustav Mahler, Symphony No. 3"
          ]
        },
        "height": 998,
        "width": 772,
        "items": [
          {
            "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying/annotation/page",
            "type": "AnnotationPage",
            "items": [
              {
                "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying/annotation/image",
                "type": "Annotation",
                "motivation": "painting",
                "body": {
                  "id": "https://iiif.io/api/image/3.0/example/reference/4b45bba3ea612ee46f5371ce84dbcd89-mahler-0/full/,998/0/default.jpg",
                  "type": "Image",
                  "format": "image/jpeg",
                  "height": 998,
                  "width": 772,
                  "service": [
                    {
                      "id": "https://iiif.io/api/image/3.0/example/reference/4b45bba3ea612ee46f5371ce84dbcd89-mahler-0",
                      "type": "ImageService3",
                      "profile": "level1"
                    }
                  ]
                },
                "target": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying"
              }
            ]
          }
        ]
      },
      "items": [
        {
          "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/page/p1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/page/annotation/segment1-audio",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://fixtures.iiif.io/audio/indiana/mahler-symphony-3/CD1/medium/128Kbps.mp4",
                "type": "Sound",
                "duration": 1985.024,
                "format": "video/mp4"
              },
              "target": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/p1"
            }
          ]
        }
      ]
    }
  ]
}
```

## Use Case

You have content you would like to provide to the user to enrich the presentation or experience of the main content. It could be something to experience before the user chooses to start interacting with the main content and/or something additional to consider while interacting with the main content. You might want to have an image available while an audio-only Canvas is playing or, conversely, audio available while a user is navigating an image-only Manifest.

## Implementation notes

Across a Manifest and its properties, you may use more than one `accompanyingCanvas`, allowing you to have an authentic `accompanyingCanvas` for each appropriate resource (Collection, Manifest, Canvas, and Range).

The `target` of the `Annotation` of an `accompanyingCanvas` should have as its value the `id` of the `accompanyingCanvas`, not the `id` of the resource that has the `accompanyingCanvas`.

Always keep in mind the wide latitude given conforming clients: It is up to the client whether and in what sort of UI to display content you place in a `accompanyingCanvas` property. Don’t use this property for content that must be displayed. On the other hand, placing content in a `accompanyingCanvas` does tell a client that the content, if displayed, should be displayed at the same time as the resource to which it is attached.

## Restrictions

Each instance of `accompanyingCanvas` may only contain one Canvas, and as such may specifically not contain an additional `accompanyingCanvas` or a `placeholderCanvas`.

## Example

In the example, the main Canvas contains audio of a performance of Gustav Mahler’s Symphony No. 3 and the `accompanyingCanvas` contains an image of a page from the score.

[JSON-LD](https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas//manifest.json) | [View in Clover](https://samvera-labs.github.io/clover-iiif/docs/viewer/demo?iiif-content=https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json) | [View in Aviary](https://iiif.aviaryplatform.com/player?manifest=https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json) | [View in Theseus](https://theseusviewer.org/?iiif-content=https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json)

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/manifest.json",
  "type": "Manifest",
  "label": {
    "en": [
      "Partial audio recording of Gustav Mahler's _Symphony No. 3_"
    ]
  },
  "items": [
    {
      "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/p1",
      "type": "Canvas",
      "label": {
        "en": [
          "Gustav Mahler, Symphony No. 3, CD 1"
        ]
      },
      "duration": 1985.024,
      "accompanyingCanvas": {
        "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying",
        "type": "Canvas",
        "label": {
          "en": [
            "First page of score for Gustav Mahler, Symphony No. 3"
          ]
        },
        "height": 998,
        "width": 772,
        "items": [
          {
            "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying/annotation/page",
            "type": "AnnotationPage",
            "items": [
              {
                "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying/annotation/image",
                "type": "Annotation",
                "motivation": "painting",
                "body": {
                  "id": "https://iiif.io/api/image/3.0/example/reference/4b45bba3ea612ee46f5371ce84dbcd89-mahler-0/full/,998/0/default.jpg",
                  "type": "Image",
                  "format": "image/jpeg",
                  "height": 998,
                  "width": 772,
                  "service": [
                    {
                      "id": "https://iiif.io/api/image/3.0/example/reference/4b45bba3ea612ee46f5371ce84dbcd89-mahler-0",
                      "type": "ImageService3",
                      "profile": "level1"
                    }
                  ]
                },
                "target": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/accompanying"
              }
            ]
          }
        ]
      },
      "items": [
        {
          "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/page/p1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/page/annotation/segment1-audio",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://fixtures.iiif.io/audio/indiana/mahler-symphony-3/CD1/medium/128Kbps.mp4",
                "type": "Sound",
                "duration": 1985.024,
                "format": "video/mp4"
              },
              "target": "https://iiif.io/api/cookbook/recipe/0014-accompanyingcanvas/canvas/p1"
            }
          ]
        }
      ]
    }
  ]
}
```
