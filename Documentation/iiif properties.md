# IIIF Presentation API 3.0 Property Reference

A machine-oriented reference for implementing IIIF Presentation API 3.0 validators, generators, and processors.

---

## Resource Types

```
Collection | Manifest | Canvas | Range | AnnotationPage | AnnotationCollection | Annotation | ContentResource
```

---

## Property Requirement Levels

```
REQUIRED     - must be present
RECOMMENDED  - should be present
OPTIONAL     - may be present
NOT_ALLOWED  - must not be present
CONDITIONAL  - required if related property is present
```

---

## Property Requirements by Resource Type

### Descriptive Properties

#### label

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | REQUIRED | LanguageMap |
| Manifest | REQUIRED | LanguageMap |
| Canvas | RECOMMENDED | LanguageMap |
| Range | RECOMMENDED | LanguageMap |
| AnnotationPage | OPTIONAL | LanguageMap |
| AnnotationCollection | RECOMMENDED | LanguageMap |
| Annotation | OPTIONAL | LanguageMap |
| ContentResource | OPTIONAL | LanguageMap |

```json
{
  "property": "label",
  "valueType": "LanguageMap",
  "requirements": {
    "Collection": "REQUIRED",
    "Manifest": "REQUIRED",
    "Canvas": "RECOMMENDED",
    "Range": "RECOMMENDED",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "RECOMMENDED",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "clientBehavior": {
    "Collection": "MUST_RENDER",
    "Manifest": "MUST_RENDER",
    "Canvas": "MUST_RENDER_OR_GENERATE",
    "Range": "MUST_RENDER",
    "AnnotationCollection": "SHOULD_RENDER",
    "other": "MAY_RENDER"
  },
  "example": { "en": ["Example Object Title"] }
}
```

#### metadata

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | RECOMMENDED | MetadataEntry[] |
| Manifest | RECOMMENDED | MetadataEntry[] |
| Canvas | OPTIONAL | MetadataEntry[] |
| Range | OPTIONAL | MetadataEntry[] |
| AnnotationPage | OPTIONAL | MetadataEntry[] |
| AnnotationCollection | OPTIONAL | MetadataEntry[] |
| Annotation | OPTIONAL | MetadataEntry[] |
| ContentResource | OPTIONAL | MetadataEntry[] |

```json
{
  "property": "metadata",
  "valueType": "MetadataEntry[]",
  "requirements": {
    "Collection": "RECOMMENDED",
    "Manifest": "RECOMMENDED",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "clientBehavior": {
    "Collection": "MUST_RENDER",
    "Manifest": "MUST_RENDER",
    "Canvas": "SHOULD_RENDER",
    "other": "MAY_RENDER"
  },
  "notes": ["Clients should display entries in provided order", "Expect long texts in value property"]
}
```

#### summary

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | RECOMMENDED | LanguageMap |
| Manifest | RECOMMENDED | LanguageMap |
| Canvas | OPTIONAL | LanguageMap |
| Range | OPTIONAL | LanguageMap |
| AnnotationPage | OPTIONAL | LanguageMap |
| AnnotationCollection | OPTIONAL | LanguageMap |
| Annotation | OPTIONAL | LanguageMap |
| ContentResource | OPTIONAL | LanguageMap |

```json
{
  "property": "summary",
  "valueType": "LanguageMap",
  "requirements": {
    "Collection": "RECOMMENDED",
    "Manifest": "RECOMMENDED",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  }
}
```

#### requiredStatement

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | LabelValuePair |
| Manifest | OPTIONAL | LabelValuePair |
| Canvas | OPTIONAL | LabelValuePair |
| Range | OPTIONAL | LabelValuePair |
| AnnotationPage | OPTIONAL | LabelValuePair |
| AnnotationCollection | OPTIONAL | LabelValuePair |
| Annotation | OPTIONAL | LabelValuePair |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "requiredStatement",
  "valueType": "LabelValuePair",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "NOT_ALLOWED"
  },
  "clientBehavior": {
    "all": "MUST_RENDER"
  },
  "notes": ["If initially hidden, method of revealing must be obvious"]
}
```

#### rights

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | URI (string) |
| Manifest | OPTIONAL | URI (string) |
| Canvas | OPTIONAL | URI (string) |
| Range | OPTIONAL | URI (string) |
| AnnotationPage | OPTIONAL | URI (string) |
| AnnotationCollection | OPTIONAL | URI (string) |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "rights",
  "valueType": "URI",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "validValues": {
    "pattern": "URI from Creative Commons, RightsStatements.org, or extension",
    "examples": [
      "http://creativecommons.org/licenses/by/4.0/",
      "http://rightsstatements.org/vocab/InC/1.0/"
    ]
  }
}
```

#### provider

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | RECOMMENDED | Agent[] |
| Manifest | RECOMMENDED | Agent[] |
| Canvas | OPTIONAL | Agent[] |
| Range | OPTIONAL | Agent[] |
| AnnotationPage | OPTIONAL | Agent[] |
| AnnotationCollection | OPTIONAL | Agent[] |
| Annotation | OPTIONAL | Agent[] |
| ContentResource | OPTIONAL | Agent[] |

```json
{
  "property": "provider",
  "valueType": "Agent[]",
  "requirements": {
    "Collection": "RECOMMENDED",
    "Manifest": "RECOMMENDED",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "clientBehavior": {
    "Collection": "MUST_RENDER",
    "Manifest": "MUST_RENDER",
    "other": "SHOULD_RENDER"
  }
}
```

#### thumbnail

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | RECOMMENDED | ContentResource[] |
| Manifest | RECOMMENDED | ContentResource[] |
| Canvas | OPTIONAL* | ContentResource[] |
| Range | OPTIONAL | ContentResource[] |
| AnnotationPage | OPTIONAL | ContentResource[] |
| AnnotationCollection | OPTIONAL | ContentResource[] |
| Annotation | OPTIONAL | ContentResource[] |
| ContentResource | OPTIONAL* | ContentResource[] |

*Canvas SHOULD have thumbnail if multiple resources make up the view
*ContentResource SHOULD have thumbnail if it's an option in a Choice

```json
{
  "property": "thumbnail",
  "valueType": "ContentResource[]",
  "requirements": {
    "Collection": "RECOMMENDED",
    "Manifest": "RECOMMENDED",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "conditionalRequirements": [
    { "on": "Canvas", "condition": "multipleResources", "then": "RECOMMENDED" },
    { "on": "ContentResource", "condition": "isChoiceOption", "then": "RECOMMENDED" }
  ],
  "contentProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED",
    "format": "RECOMMENDED",
    "width": "RECOMMENDED_FOR_IMAGE_VIDEO",
    "height": "RECOMMENDED_FOR_IMAGE_VIDEO",
    "duration": "RECOMMENDED_FOR_TIME_BASED"
  }
}
```

#### navDate

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | xsd:dateTime |
| Manifest | OPTIONAL | xsd:dateTime |
| Canvas | OPTIONAL | xsd:dateTime |
| Range | OPTIONAL | xsd:dateTime |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "navDate",
  "valueType": "xsd:dateTime",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "format": {
    "pattern": "ISO 8601 with timezone",
    "preferred": "UTC with Z indicator",
    "alternative": "offset +hh:mm",
    "example": "2010-01-01T00:00:00Z"
  }
}
```

#### placeholderCanvas

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | Canvas |
| Manifest | OPTIONAL | Canvas |
| Canvas | OPTIONAL* | Canvas |
| Range | OPTIONAL | Canvas |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

*A Canvas used AS a placeholderCanvas cannot itself have placeholderCanvas or accompanyingCanvas

```json
{
  "property": "placeholderCanvas",
  "valueType": "Canvas",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "constraints": [
    "Value must have id and type properties",
    "type must be 'Canvas'",
    "Value must not have placeholderCanvas property",
    "Value must not have accompanyingCanvas property"
  ]
}
```

#### accompanyingCanvas

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | Canvas |
| Manifest | OPTIONAL | Canvas |
| Canvas | OPTIONAL* | Canvas |
| Range | OPTIONAL | Canvas |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "accompanyingCanvas",
  "valueType": "Canvas",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "constraints": [
    "Value must have id and type properties",
    "type must be 'Canvas'",
    "Value must not have placeholderCanvas property",
    "Value must not have accompanyingCanvas property"
  ]
}
```

---

### Technical Properties

#### id

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | REQUIRED | URI (string) |
| Manifest | REQUIRED | URI (string) |
| Canvas | REQUIRED | URI (string) |
| Range | REQUIRED | URI (string) |
| AnnotationPage | REQUIRED | URI (string) |
| AnnotationCollection | REQUIRED | URI (string) |
| Annotation | REQUIRED | URI (string) |
| ContentResource | REQUIRED | URI (string) |

```json
{
  "property": "id",
  "valueType": "URI",
  "requirements": {
    "Collection": "REQUIRED",
    "Manifest": "REQUIRED",
    "Canvas": "REQUIRED",
    "Range": "REQUIRED",
    "AnnotationPage": "REQUIRED",
    "AnnotationCollection": "REQUIRED",
    "Annotation": "REQUIRED",
    "ContentResource": "REQUIRED"
  },
  "constraints": [
    "Must be HTTP(S) URI for IIIF resources",
    "Canvas id must not contain fragment identifier",
    "Embedded resources may use fragment identifiers",
    "If referenced (not embedded), must be dereferenceable"
  ]
}
```

#### type

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | REQUIRED | string ("Collection") |
| Manifest | REQUIRED | string ("Manifest") |
| Canvas | REQUIRED | string ("Canvas") |
| Range | REQUIRED | string ("Range") |
| AnnotationPage | REQUIRED | string ("AnnotationPage") |
| AnnotationCollection | REQUIRED | string ("AnnotationCollection") |
| Annotation | REQUIRED | string ("Annotation") |
| ContentResource | REQUIRED | string (varies) |

```json
{
  "property": "type",
  "valueType": "string",
  "requirements": {
    "Collection": "REQUIRED",
    "Manifest": "REQUIRED",
    "Canvas": "REQUIRED",
    "Range": "REQUIRED",
    "AnnotationPage": "REQUIRED",
    "AnnotationCollection": "REQUIRED",
    "Annotation": "REQUIRED",
    "ContentResource": "REQUIRED"
  },
  "fixedValues": {
    "Collection": "Collection",
    "Manifest": "Manifest",
    "Canvas": "Canvas",
    "Range": "Range",
    "AnnotationPage": "AnnotationPage",
    "AnnotationCollection": "AnnotationCollection",
    "Annotation": "Annotation"
  },
  "contentResourceTypes": {
    "Dataset": "Data not intended for direct human rendering",
    "Image": "2D visual resources (renders with <img>)",
    "Model": "3D+ models for human interaction",
    "Sound": "Auditory resources (renders with <audio>)",
    "Text": "Resources primarily intended to be read",
    "Video": "Moving images with/without audio (renders with <video>)"
  }
}
```

#### format

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | NOT_ALLOWED | - |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | RECOMMENDED | MIME type (string) |

```json
{
  "property": "format",
  "valueType": "MIMEType",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "NOT_ALLOWED",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "RECOMMENDED"
  },
  "notes": ["Should match Content-Type header when resource is dereferenced"],
  "examples": ["image/jpeg", "image/png", "image/tiff", "application/pdf", "text/plain", "text/html", "application/xml"]
}
```

#### profile

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | NOT_ALLOWED | - |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | OPTIONAL | URI or string |

```json
{
  "property": "profile",
  "valueType": "URI_or_string",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "NOT_ALLOWED",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "OPTIONAL"
  },
  "recommendedOn": ["seeAlso targets", "service resources"],
  "notes": ["Value from profiles registry or a URI"]
}
```

#### height

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | CONDITIONAL | positive integer |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | RECOMMENDED* | positive integer (pixels) |

*If appropriate to resource type (images, video)

```json
{
  "property": "height",
  "valueType": "positiveInteger",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "CONDITIONAL",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "RECOMMENDED"
  },
  "conditionalRules": [
    { "on": "Canvas", "condition": "hasWidth", "then": "REQUIRED" },
    { "on": "ContentResource", "condition": "isVisual", "then": "RECOMMENDED" }
  ],
  "units": {
    "Canvas": "unitless (aspect ratio)",
    "ContentResource": "pixels"
  }
}
```

#### width

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | CONDITIONAL | positive integer |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | RECOMMENDED* | positive integer (pixels) |

```json
{
  "property": "width",
  "valueType": "positiveInteger",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "CONDITIONAL",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "RECOMMENDED"
  },
  "conditionalRules": [
    { "on": "Canvas", "condition": "hasHeight", "then": "REQUIRED" },
    { "on": "ContentResource", "condition": "isVisual", "then": "RECOMMENDED" }
  ]
}
```

#### duration

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | OPTIONAL | positive float (seconds) |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | RECOMMENDED* | positive float (seconds) |

*If appropriate to resource type (audio, video)

```json
{
  "property": "duration",
  "valueType": "positiveFloat",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "OPTIONAL",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "RECOMMENDED"
  },
  "conditionalRules": [
    { "on": "ContentResource", "condition": "isTimeBased", "then": "RECOMMENDED" }
  ],
  "units": "seconds",
  "example": 125.0
}
```

#### viewingDirection

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | string (enum) |
| Manifest | OPTIONAL | string (enum) |
| Canvas | NOT_ALLOWED | - |
| Range | OPTIONAL | string (enum) |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "viewingDirection",
  "valueType": "enum",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "NOT_ALLOWED",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "validValues": {
    "left-to-right": "Default. Object displayed left to right.",
    "right-to-left": "Object displayed right to left.",
    "top-to-bottom": "Object displayed top to bottom.",
    "bottom-to-top": "Object displayed bottom to top."
  },
  "default": "left-to-right"
}
```

#### behavior

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | string[] |
| Manifest | OPTIONAL | string[] |
| Canvas | OPTIONAL | string[] |
| Range | OPTIONAL | string[] |
| AnnotationPage | OPTIONAL | string[] |
| AnnotationCollection | OPTIONAL | string[] |
| Annotation | OPTIONAL | string[] |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "behavior",
  "valueType": "string[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "NOT_ALLOWED"
  }
}
```

#### timeMode

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | NOT_ALLOWED | - |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | OPTIONAL | string (enum) |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "timeMode",
  "valueType": "enum",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "NOT_ALLOWED",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "OPTIONAL",
    "ContentResource": "NOT_ALLOWED"
  },
  "validValues": {
    "trim": "Default. Content longer than Canvas duration is cut off. Video: last frame persists if shorter.",
    "scale": "Content duration scaled to fit Canvas duration.",
    "loop": "Content repeated to fill Canvas duration. Longer content is trimmed."
  },
  "default": "trim"
}
```

---

### Linking Properties (External)

#### homepage

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | ExternalResource[] |
| Manifest | OPTIONAL | ExternalResource[] |
| Canvas | OPTIONAL | ExternalResource[] |
| Range | OPTIONAL | ExternalResource[] |
| AnnotationPage | OPTIONAL | ExternalResource[] |
| AnnotationCollection | OPTIONAL | ExternalResource[] |
| Annotation | OPTIONAL | ExternalResource[] |
| ContentResource | OPTIONAL | ExternalResource[] |

```json
{
  "property": "homepage",
  "valueType": "ExternalResource[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "itemProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED",
    "label": "REQUIRED",
    "format": "RECOMMENDED",
    "language": "OPTIONAL"
  },
  "notes": ["Resource must be directly displayable to user", "Related but non-homepage resources go in metadata"]
}
```

#### logo

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Agent | RECOMMENDED | ContentResource[] |

```json
{
  "property": "logo",
  "valueType": "ContentResource[]",
  "requirements": {
    "Agent": "RECOMMENDED"
  },
  "clientBehavior": {
    "Agent": "MUST_RENDER"
  },
  "itemProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED (must be 'Image')",
    "format": "RECOMMENDED",
    "width": "RECOMMENDED",
    "height": "RECOMMENDED"
  },
  "constraints": [
    "Must be rendered clearly without cropping/rotating/distorting",
    "IIIF Image API service recommended for resizing"
  ]
}
```

#### rendering

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | ExternalResource[] |
| Manifest | OPTIONAL | ExternalResource[] |
| Canvas | OPTIONAL | ExternalResource[] |
| Range | OPTIONAL | ExternalResource[] |
| AnnotationPage | OPTIONAL | ExternalResource[] |
| AnnotationCollection | OPTIONAL | ExternalResource[] |
| Annotation | OPTIONAL | ExternalResource[] |
| ContentResource | OPTIONAL | ExternalResource[] |

```json
{
  "property": "rendering",
  "valueType": "ExternalResource[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "itemProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED",
    "label": "REQUIRED",
    "format": "RECOMMENDED"
  },
  "constraints": [
    "Must be directly displayable to human user",
    "Must not have splash page or interstitial",
    "Use IIIF Auth API if access control needed"
  ],
  "examples": ["PDF of book", "EPUB", "3D model file"]
}
```

#### service

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | Service[] |
| Manifest | OPTIONAL | Service[] |
| Canvas | OPTIONAL | Service[] |
| Range | OPTIONAL | Service[] |
| AnnotationPage | OPTIONAL | Service[] |
| AnnotationCollection | OPTIONAL | Service[] |
| Annotation | OPTIONAL | Service[] |
| ContentResource | OPTIONAL | Service[] |

```json
{
  "property": "service",
  "valueType": "Service[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "itemProperties": {
    "id_or_@id": "REQUIRED",
    "type_or_@type": "REQUIRED",
    "profile": "RECOMMENDED"
  },
  "legacyTypeValues": {
    "ImageService1": "Image API version 1",
    "ImageService2": "Image API version 2",
    "ImageService3": "Image API version 3",
    "SearchService1": "Search API version 1",
    "AutoCompleteService1": "Search API version 1",
    "AuthCookieService1": "Authentication API version 1",
    "AuthTokenService1": "Authentication API version 1",
    "AuthLogoutService1": "Authentication API version 1"
  }
}
```

#### services

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL* | Service[] |
| Manifest | OPTIONAL | Service[] |

*Only on topmost Collection in response document

```json
{
  "property": "services",
  "valueType": "Service[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL"
  },
  "constraints": [
    "Only valid on topmost resource of document",
    "Used for shared services referenced multiple times in document"
  ],
  "notes": [
    "Client should check services list when encountering service with only id/type",
    "If not found and more info needed, dereference the service id"
  ]
}
```

#### seeAlso

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | ExternalResource[] |
| Manifest | OPTIONAL | ExternalResource[] |
| Canvas | OPTIONAL | ExternalResource[] |
| Range | OPTIONAL | ExternalResource[] |
| AnnotationPage | OPTIONAL | ExternalResource[] |
| AnnotationCollection | OPTIONAL | ExternalResource[] |
| Annotation | OPTIONAL | ExternalResource[] |
| ContentResource | OPTIONAL | ExternalResource[] |

```json
{
  "property": "seeAlso",
  "valueType": "ExternalResource[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "itemProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED",
    "label": "RECOMMENDED",
    "format": "RECOMMENDED",
    "profile": "RECOMMENDED"
  },
  "notes": [
    "Machine-readable resources (XML, RDF, JSON-LD)",
    "URI must identify single representation",
    "Separate entries for same data in different formats"
  ]
}
```

---

### Linking Properties (Internal)

#### partOf

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | Reference[] |
| Manifest | OPTIONAL | Reference[] |
| Canvas | OPTIONAL | Reference[] |
| Range | OPTIONAL | Reference[] |
| AnnotationPage | OPTIONAL | Reference[] |
| AnnotationCollection | OPTIONAL | Reference[] |
| Annotation | OPTIONAL | Reference[] |
| ContentResource | OPTIONAL | Reference[] |

```json
{
  "property": "partOf",
  "valueType": "Reference[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "OPTIONAL",
    "AnnotationCollection": "OPTIONAL",
    "Annotation": "OPTIONAL",
    "ContentResource": "OPTIONAL"
  },
  "itemProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED",
    "label": "RECOMMENDED"
  }
}
```

#### start

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | OPTIONAL | Canvas or SpecificResource |
| Canvas | NOT_ALLOWED | - |
| Range | OPTIONAL | Canvas or SpecificResource |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "start",
  "valueType": "Canvas_or_SpecificResource",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "OPTIONAL",
    "Canvas": "NOT_ALLOWED",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "valueFormats": [
    {
      "description": "Canvas reference",
      "required": ["id", "type"],
      "typeValue": "Canvas"
    },
    {
      "description": "SpecificResource with Selector",
      "required": ["id", "type", "source", "selector"],
      "typeValue": "SpecificResource"
    }
  ]
}
```

#### supplementary

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | NOT_ALLOWED | - |
| Canvas | NOT_ALLOWED | - |
| Range | OPTIONAL | AnnotationCollection |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "supplementary",
  "valueType": "AnnotationCollection",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "NOT_ALLOWED",
    "Canvas": "NOT_ALLOWED",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "itemProperties": {
    "id": "REQUIRED",
    "type": "REQUIRED (must be 'AnnotationCollection')"
  }
}
```

---

### Structural Properties

#### items

| Resource | Requirement | Contains |
|----------|-------------|----------|
| Collection | REQUIRED | Collection[] or Manifest[] |
| Manifest | REQUIRED (min 1) | Canvas[] |
| Canvas | RECOMMENDED (min 1) | AnnotationPage[] |
| Range | REQUIRED (min 1) | Range[] or Canvas[] or SpecificResource[] |
| AnnotationPage | RECOMMENDED (min 1) | Annotation[] |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "items",
  "valueType": "varies_by_resource",
  "requirements": {
    "Collection": { "level": "REQUIRED", "contains": ["Collection", "Manifest"] },
    "Manifest": { "level": "REQUIRED", "minItems": 1, "contains": ["Canvas"] },
    "Canvas": { "level": "RECOMMENDED", "minItems": 1, "contains": ["AnnotationPage"] },
    "Range": { "level": "REQUIRED", "minItems": 1, "contains": ["Range", "Canvas", "SpecificResource"] },
    "AnnotationPage": { "level": "RECOMMENDED", "minItems": 1, "contains": ["Annotation"] },
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  }
}
```

#### structures

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | NOT_ALLOWED | - |
| Manifest | OPTIONAL | Range[] |
| Canvas | NOT_ALLOWED | - |
| Range | NOT_ALLOWED | - |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | NOT_ALLOWED | - |

```json
{
  "property": "structures",
  "valueType": "Range[]",
  "requirements": {
    "Collection": "NOT_ALLOWED",
    "Manifest": "OPTIONAL",
    "Canvas": "NOT_ALLOWED",
    "Range": "NOT_ALLOWED",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "NOT_ALLOWED"
  },
  "notes": [
    "First hierarchy presented to user by default",
    "Additional hierarchies selectable as alternatives"
  ]
}
```

#### annotations

| Resource | Requirement | Value Type |
|----------|-------------|------------|
| Collection | OPTIONAL | AnnotationPage[] |
| Manifest | OPTIONAL | AnnotationPage[] |
| Canvas | OPTIONAL | AnnotationPage[] |
| Range | OPTIONAL | AnnotationPage[] |
| AnnotationPage | NOT_ALLOWED | - |
| AnnotationCollection | NOT_ALLOWED | - |
| Annotation | NOT_ALLOWED | - |
| ContentResource | OPTIONAL | AnnotationPage[] |

```json
{
  "property": "annotations",
  "valueType": "AnnotationPage[]",
  "requirements": {
    "Collection": "OPTIONAL",
    "Manifest": "OPTIONAL",
    "Canvas": "OPTIONAL",
    "Range": "OPTIONAL",
    "AnnotationPage": "NOT_ALLOWED",
    "AnnotationCollection": "NOT_ALLOWED",
    "Annotation": "NOT_ALLOWED",
    "ContentResource": "OPTIONAL"
  },
  "constraints": [
    "Motivation of contained Annotations must NOT be 'painting'",
    "Target of Annotations must include the resource or part of it"
  ]
}
```

---

## Behavior Values Reference

### Validity Matrix

| Behavior | Collection | Manifest | Canvas | Range |
|----------|------------|----------|--------|-------|
| auto-advance | ✓ | ✓ | ✓ | ✓ |
| no-auto-advance | ✓ | ✓ | ✓ | ✓ |
| repeat | ✓ | ✓ | ✗ | ✗ |
| no-repeat | ✓ | ✓ | ✗ | ✗ |
| unordered | ✓ | ✓ | ✗ | ✓ |
| individuals | ✓ | ✓ | ✗ | ✓ |
| continuous | ✓ | ✓ | ✗ | ✓ |
| paged | ✓ | ✓ | ✗ | ✓ |
| facing-pages | ✗ | ✗ | ✓ | ✗ |
| non-paged | ✗ | ✗ | ✓ | ✗ |
| multi-part | ✓ | ✗ | ✗ | ✗ |
| together | ✓ | ✗ | ✗ | ✗ |
| sequence | ✗ | ✗ | ✗ | ✓ |
| thumbnail-nav | ✗ | ✗ | ✗ | ✓ |
| no-nav | ✗ | ✗ | ✗ | ✓ |
| hidden | ✗* | ✗* | ✗* | ✗* |

*hidden is valid on: AnnotationCollection, AnnotationPage, Annotation, SpecificResource, Choice

```json
{
  "behaviorValidity": {
    "auto-advance": ["Collection", "Manifest", "Canvas", "Range"],
    "no-auto-advance": ["Collection", "Manifest", "Canvas", "Range"],
    "repeat": ["Collection", "Manifest"],
    "no-repeat": ["Collection", "Manifest"],
    "unordered": ["Collection", "Manifest", "Range"],
    "individuals": ["Collection", "Manifest", "Range"],
    "continuous": ["Collection", "Manifest", "Range"],
    "paged": ["Collection", "Manifest", "Range"],
    "facing-pages": ["Canvas"],
    "non-paged": ["Canvas"],
    "multi-part": ["Collection"],
    "together": ["Collection"],
    "sequence": ["Range"],
    "thumbnail-nav": ["Range"],
    "no-nav": ["Range"],
    "hidden": ["AnnotationCollection", "AnnotationPage", "Annotation", "SpecificResource", "Choice"]
  }
}
```

### Disjoint Sets (Mutually Exclusive)

```json
{
  "disjointSets": [
    {
      "name": "temporal_advance",
      "values": ["auto-advance", "no-auto-advance"],
      "default": "no-auto-advance"
    },
    {
      "name": "temporal_repeat",
      "values": ["repeat", "no-repeat"],
      "default": "no-repeat"
    },
    {
      "name": "layout",
      "values": ["unordered", "individuals", "continuous", "paged"],
      "default": "individuals"
    },
    {
      "name": "canvas_paging",
      "values": ["paged", "facing-pages", "non-paged"],
      "notes": "paged is in both layout and canvas_paging sets"
    },
    {
      "name": "collection_presentation",
      "values": ["multi-part", "together"]
    },
    {
      "name": "range_navigation",
      "values": ["sequence", "thumbnail-nav", "no-nav"]
    }
  ]
}
```

### Behavior Inheritance Rules

```json
{
  "inheritanceRules": [
    {
      "resource": "Collection",
      "inheritsFrom": "referencing Collection",
      "inherits": true
    },
    {
      "resource": "Manifest",
      "inheritsFrom": "referencing Collection",
      "inherits": false
    },
    {
      "resource": "Canvas",
      "inheritsFrom": "referencing Manifest",
      "inherits": true
    },
    {
      "resource": "Canvas",
      "inheritsFrom": "referencing Range",
      "inherits": false
    },
    {
      "resource": "Range",
      "inheritsFrom": "referencing Range",
      "inherits": true
    },
    {
      "resource": "Range",
      "inheritsFrom": "referencing Manifest",
      "inherits": true
    }
  ],
  "resolution": "When conflict exists, value from closest resource takes precedence"
}
```

### Behavior Descriptions

```json
{
  "behaviorDescriptions": {
    "temporal": {
      "auto-advance": {
        "description": "Proceed to next Canvas/segment when current one ends",
        "requires": "duration dimension",
        "collectionBehavior": "First Canvas of next Manifest follows last Canvas of previous"
      },
      "no-auto-advance": {
        "description": "Do not proceed automatically when Canvas/segment ends",
        "default": true
      },
      "repeat": {
        "description": "Loop back to first Canvas when reaching end (if auto-advance active)",
        "requires": "duration dimension"
      },
      "no-repeat": {
        "description": "Do not loop back to beginning",
        "default": true
      }
    },
    "layout": {
      "unordered": {
        "description": "Canvases have no inherent order, UI should not imply order"
      },
      "individuals": {
        "description": "Each Canvas is a distinct view, not for page-turning interface",
        "default": true
      },
      "continuous": {
        "description": "Canvases are partial views, display stitched together (e.g., scroll)",
        "requires": "height and width dimensions",
        "respects": "viewingDirection"
      },
      "paged": {
        "description": "Display in page-turning interface, first canvas is recto",
        "requires": "height and width dimensions"
      }
    },
    "canvas_specific": {
      "facing-pages": {
        "description": "Canvas depicts both parts of opening, display alone",
        "context": "Only meaningful when Manifest has paged behavior"
      },
      "non-paged": {
        "description": "Skip this Canvas in page-turning interface",
        "context": "Only meaningful when Manifest has paged behavior"
      }
    },
    "collection_specific": {
      "multi-part": {
        "description": "Child Manifests/Collections form logical whole (e.g., multi-volume)",
        "rendering": "Table of contents rather than thumbnails"
      },
      "together": {
        "description": "Present all child Manifests simultaneously in separate viewing area"
      }
    },
    "range_specific": {
      "sequence": {
        "description": "Range represents alternative ordering of Manifest's Canvases",
        "context": "Must be in Manifest's structures property"
      },
      "thumbnail-nav": {
        "description": "Use for thumbnail-based navigation (keyframes, scroll sections)",
        "requirement": "Child Ranges must have suitable thumbnail"
      },
      "no-nav": {
        "description": "Do not display in navigation hierarchy (blank pages, dead air)"
      }
    },
    "visibility": {
      "hidden": {
        "description": "Do not render by default, allow user to toggle",
        "validOn": ["AnnotationCollection", "AnnotationPage", "Annotation", "SpecificResource", "Choice"],
        "inherits": false
      }
    }
  }
}
```

---

## Motivation Values

```json
{
  "motivations": {
    "painting": {
      "description": "Content is OF the Canvas - primary visual/audio representation",
      "clientBehavior": "MUST present as Canvas representation",
      "validTarget": "Canvas only"
    },
    "supplementing": {
      "description": "Content is FROM the Canvas - additional/related content",
      "clientBehavior": "MAY present in Canvas area or elsewhere",
      "validTarget": "Canvas only",
      "examples": ["OCR text", "transcription", "translation", "captions", "diagram explanation"]
    }
  },
  "otherMotivations": "Use W3C Web Annotation motivations where appropriate"
}
```

---

## Value Types Reference

### LanguageMap

```json
{
  "type": "LanguageMap",
  "description": "Object with language codes as keys, arrays of strings as values",
  "format": {
    "pattern": "{ [languageCode]: string[] }",
    "languageCode": "BCP 47 language tag or 'none'",
    "example": {
      "en": ["English Label"],
      "fr": ["Étiquette française"],
      "none": ["Untranslated text"]
    }
  }
}
```

### MetadataEntry

```json
{
  "type": "MetadataEntry",
  "description": "Label-value pair for display",
  "format": {
    "label": "LanguageMap (REQUIRED)",
    "value": "LanguageMap (REQUIRED)"
  },
  "example": {
    "label": { "en": ["Creator"] },
    "value": { "en": ["Anne Artist (1776-1824)"] }
  }
}
```

### LabelValuePair

```json
{
  "type": "LabelValuePair",
  "description": "Same as MetadataEntry, used for requiredStatement",
  "format": {
    "label": "LanguageMap (REQUIRED)",
    "value": "LanguageMap (REQUIRED)"
  }
}
```

### Agent

```json
{
  "type": "Agent",
  "description": "Organization or person",
  "properties": {
    "id": { "requirement": "REQUIRED", "type": "URI" },
    "type": { "requirement": "REQUIRED", "value": "Agent" },
    "label": { "requirement": "REQUIRED", "type": "LanguageMap" },
    "homepage": { "requirement": "RECOMMENDED", "type": "ExternalResource[]" },
    "logo": { "requirement": "RECOMMENDED", "type": "ContentResource[]" },
    "seeAlso": { "requirement": "OPTIONAL", "type": "ExternalResource[]" }
  }
}
```

### Reference

```json
{
  "type": "Reference",
  "description": "Minimal reference to another resource",
  "properties": {
    "id": { "requirement": "REQUIRED", "type": "URI" },
    "type": { "requirement": "REQUIRED", "type": "string" },
    "label": { "requirement": "RECOMMENDED", "type": "LanguageMap" }
  }
}
```

### ExternalResource

```json
{
  "type": "ExternalResource",
  "description": "Reference to external web resource",
  "properties": {
    "id": { "requirement": "REQUIRED", "type": "URI" },
    "type": { "requirement": "REQUIRED", "type": "string" },
    "label": { "requirement": "VARIES", "type": "LanguageMap" },
    "format": { "requirement": "RECOMMENDED", "type": "MIMEType" },
    "profile": { "requirement": "OPTIONAL", "type": "URI_or_string" },
    "language": { "requirement": "OPTIONAL", "type": "string[]" }
  }
}
```

---

## Complete Property Matrix (JSON)

```json
{
  "propertyMatrix": {
    "label": {
      "Collection": "REQUIRED", "Manifest": "REQUIRED", "Canvas": "RECOMMENDED",
      "Range": "RECOMMENDED", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "RECOMMENDED",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "metadata": {
      "Collection": "RECOMMENDED", "Manifest": "RECOMMENDED", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "summary": {
      "Collection": "RECOMMENDED", "Manifest": "RECOMMENDED", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "requiredStatement": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "NOT_ALLOWED"
    },
    "rights": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "navDate": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "language": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "NOT_ALLOWED",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "RECOMMENDED"
    },
    "provider": {
      "Collection": "RECOMMENDED", "Manifest": "RECOMMENDED", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "thumbnail": {
      "Collection": "RECOMMENDED", "Manifest": "RECOMMENDED", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "placeholderCanvas": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "accompanyingCanvas": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "id": {
      "Collection": "REQUIRED", "Manifest": "REQUIRED", "Canvas": "REQUIRED",
      "Range": "REQUIRED", "AnnotationPage": "REQUIRED", "AnnotationCollection": "REQUIRED",
      "Annotation": "REQUIRED", "ContentResource": "REQUIRED"
    },
    "type": {
      "Collection": "REQUIRED", "Manifest": "REQUIRED", "Canvas": "REQUIRED",
      "Range": "REQUIRED", "AnnotationPage": "REQUIRED", "AnnotationCollection": "REQUIRED",
      "Annotation": "REQUIRED", "ContentResource": "REQUIRED"
    },
    "format": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "NOT_ALLOWED",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "RECOMMENDED"
    },
    "profile": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "NOT_ALLOWED",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "OPTIONAL"
    },
    "height": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "CONDITIONAL",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "RECOMMENDED"
    },
    "width": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "CONDITIONAL",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "RECOMMENDED"
    },
    "duration": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "OPTIONAL",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "RECOMMENDED"
    },
    "viewingDirection": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "NOT_ALLOWED",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "behavior": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "NOT_ALLOWED"
    },
    "timeMode": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "NOT_ALLOWED",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "OPTIONAL", "ContentResource": "NOT_ALLOWED"
    },
    "homepage": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "rendering": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "service": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "services": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "NOT_ALLOWED",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "seeAlso": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "partOf": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "OPTIONAL", "AnnotationCollection": "OPTIONAL",
      "Annotation": "OPTIONAL", "ContentResource": "OPTIONAL"
    },
    "start": {
      "Collection": "NOT_ALLOWED", "Manifest": "OPTIONAL", "Canvas": "NOT_ALLOWED",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "supplementary": {
      "Collection": "NOT_ALLOWED", "Manifest": "NOT_ALLOWED", "Canvas": "NOT_ALLOWED",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "items": {
      "Collection": "REQUIRED", "Manifest": "REQUIRED", "Canvas": "RECOMMENDED",
      "Range": "REQUIRED", "AnnotationPage": "RECOMMENDED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "structures": {
      "Collection": "NOT_ALLOWED", "Manifest": "OPTIONAL", "Canvas": "NOT_ALLOWED",
      "Range": "NOT_ALLOWED", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "NOT_ALLOWED"
    },
    "annotations": {
      "Collection": "OPTIONAL", "Manifest": "OPTIONAL", "Canvas": "OPTIONAL",
      "Range": "OPTIONAL", "AnnotationPage": "NOT_ALLOWED", "AnnotationCollection": "NOT_ALLOWED",
      "Annotation": "NOT_ALLOWED", "ContentResource": "OPTIONAL"
    }
  }
}
```

---

## Minimum Viable Resources

### Minimum Collection

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/collection/1",
  "type": "Collection",
  "label": { "en": ["Collection Label"] },
  "items": []
}
```

### Minimum Manifest

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/manifest/1",
  "type": "Manifest",
  "label": { "en": ["Manifest Label"] },
  "items": [
    {
      "id": "https://example.org/iiif/manifest/1/canvas/1",
      "type": "Canvas",
      "height": 1000,
      "width": 800,
      "items": [
        {
          "id": "https://example.org/iiif/manifest/1/canvas/1/page/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://example.org/iiif/manifest/1/canvas/1/page/1/annotation/1",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://example.org/images/image1.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 1000,
                "width": 800
              },
              "target": "https://example.org/iiif/manifest/1/canvas/1"
            }
          ]
        }
      ]
    }
  ]
}
```

### Minimum Canvas

```json
{
  "id": "https://example.org/iiif/manifest/1/canvas/1",
  "type": "Canvas",
  "height": 1000,
  "width": 800,
  "items": []
}
```

### Minimum Range

```json
{
  "id": "https://example.org/iiif/manifest/1/range/1",
  "type": "Range",
  "items": []
}
```

### Minimum Annotation (painting)

```json
{
  "id": "https://example.org/iiif/manifest/1/annotation/1",
  "type": "Annotation",
  "motivation": "painting",
  "body": {
    "id": "https://example.org/images/image1.jpg",
    "type": "Image",
    "format": "image/jpeg"
  },
  "target": "https://example.org/iiif/manifest/1/canvas/1"
}
```

---

## Folder-to-IIIF Mapping Quick Reference

| File/Folder Pattern | IIIF Resource | Required Properties |
|---------------------|---------------|---------------------|
| Root folder | Collection | id, type, label, items |
| Subfolder with subfolders | Collection | id, type, label, items |
| Subfolder with only images | Manifest | id, type, label, items |
| Image file (.jpg, .png, .tif) | Canvas + Annotation + ContentResource | Canvas: id, type, height, width, items |
| Nested folders below Manifest | Range (optional) | id, type, items |
| metadata.json in folder | Populate label, metadata, summary | - |
| sequence.txt in folder | Define items order | - |

### Property Derivation from Files

| IIIF Property | Source |
|---------------|--------|
| id | Base URL + folder path + filename |
| type | Fixed per resource level |
| label | Folder/file name or metadata.json |
| height/width | Image file header |
| format | File extension → MIME type |
| items order | Natural sort or sequence.txt |
| viewingDirection | metadata.json or default left-to-right |
| behavior | Detect from content (paged/individuals/etc) |

### MIME Type Mapping

```json
{
  "mimeTypes": {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".vtt": "text/vtt",
    ".txt": "text/plain",
    ".html": "text/html",
    ".xml": "application/xml",
    ".json": "application/json"
  }
}
```
