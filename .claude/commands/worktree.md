---
description: Crea un git worktree aislado para implementar un requerimiento y trabaja dentro de él
argument-hint: <descripción del requerimiento a implementar>
---

El usuario pidió implementar lo siguiente, de forma aislada del árbol de trabajo principal:

$ARGUMENTS

Seguí estos pasos:

1. A partir del requerimiento de arriba, elegí un nombre corto en kebab-case (2-4 palabras,
   ej: `fix-scoring-bug`, `nuevo-modo-zen`) que lo describa. Ese nombre se usa como nombre de
   rama y de carpeta.
2. Verificá que `.trees/<nombre>` no exista todavía (si existe, ajustá el nombre).
3. Creá el worktree con una rama nueva desde la rama actual:
   `git worktree add -b <nombre> .trees/<nombre>`
4. A partir de ahí, hacé TODAS las lecturas, ediciones y comandos de esta tarea dentro de
   `.trees/<nombre>` (usá rutas absolutas o `cd` a esa carpeta), sin tocar el árbol de trabajo
   principal ni otros worktrees.
5. Implementá el requerimiento siguiendo las convenciones del repo (CLAUDE.md, conventional
   commits, sin "Co-Authored-By", actualizar README si corresponde).
6. Al terminar, resumí: ruta del worktree, rama creada, y los cambios realizados. No mergees,
   no borres el worktree ni la rama salvo que el usuario lo pida explícitamente.
