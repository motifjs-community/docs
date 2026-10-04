---
title: Third-party libraries
description: Wrap libraries that manage their own DOM and lifecycle.
category: reference
order: 2
---

## Own setup and cleanup {#own-setup-and-cleanup}

Initialize DOM-owning libraries after the component mounts, and register their teardown with the component. Avoid having two systems mutate the same subtree.
