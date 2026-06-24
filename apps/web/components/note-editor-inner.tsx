"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { NoteEditor, Toolbar } from "./note-editor";
import { useEditor, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";
import Mention from "@tiptap/extension-mention";
import { Extension } from "@tiptap/react";
import tippy from "tippy.js";
import Placeholder from "@tiptap/extension-placeholder";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

import type { Note } from "@/lib/api";
import {
  useNote,
  useUpdateNote,
  useOrganizationUsers,
  useFolders,
  useTenant,
  useNotes,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { NoteEditorSidebar } from "./note-editor-sidebar";
import { AlertTriangle, File, User, Users } from "lucide-react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import {
  useMyPresence,
  useOthers,
  useUpdateMyPresence,
  useSelf,
  useStatus,
} from "@liveblocks/react/suspense";

export interface NoteEditorInnerProps {
  noteId: string;
  onNoteUpdate: (noteId: string, updates: Partial<Note>) => void;
  isDirty: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  registerSaveFn?: (fn: () => Promise<void>) => void;
  doc: Y.Doc;
  provider: any;
  onPDFUpload?: (file: File) => void;
  onInviteUser?: () => void;
  onExportNote?: (note: Note) => void;
  onShareNote?: (note: Note) => void;
  isAdmin: boolean;
  readOnly?: boolean;
  onShowGraph?: () => void;
  onToggleAppSidebar?: (force?: boolean) => void;
  isLeftSidebarOpen: boolean;
  onLeftSidebarOpenChange: (open: boolean) => void;
}

// Helper to get consistent color for users based on their ID
const getUserColor = (id: string) => {
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const FileLink = Mention.extend({
  name: "fileLink",
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute("data-id"),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { "data-id": attributes.id };
        },
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        class:
          "file-link cursor-pointer text-indigo-500 hover:text-indigo-600 underline font-medium",
        "data-id": node.attrs.id,
      },
      `${node.attrs.label ?? "Untitled"}`,
    ];
  },
});

export const NoteEditorInner = React.memo(function NoteEditorInner({
  noteId,
  onNoteUpdate,
  isDirty,
  onDirtyChange,
  registerSaveFn,
  doc,
  provider,
  onPDFUpload,
  onInviteUser,
  onExportNote,
  onShareNote,
  isAdmin,
  readOnly = false,
  onShowGraph,
  onToggleAppSidebar,
  isLeftSidebarOpen,
  onLeftSidebarOpenChange,
}: NoteEditorInnerProps) {
  const { data: noteData, isLoading, error } = useNote(noteId);
  const { data: foldersData } = useFolders();
  const { data: tenant } = useTenant();
  const { data: notesData } = useNotes();
  const updateNoteMutation = useUpdateNote();
  const router = useRouter();

  const note = noteData;
  const [currentTitle, setCurrentTitle] = useState(note?.title || "");
  const [saving, setSaving] = useState(false);

  const [editorReady, setEditorReady] = useState(false);
  const [contentInitialized, setContentInitialized] = useState(false);

  const [newTag, setNewTag] = useState("");

  const isProgrammaticChange = useRef(true);
  const isStabilizing = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      isStabilizing.current = false;
    }, 1000);
    return () => clearTimeout(timer);
  }, [noteId]);

  const { data: organizationMembers } = useOrganizationUsers(true);

  const membersRef = useRef(organizationMembers);
  useEffect(() => {
    membersRef.current = organizationMembers;
  }, [organizationMembers]);

  const mentionSuggestion = useMemo(
    () => ({
      items: ({ query }: { query: string }) => {
        const membersList = membersRef.current;
        if (!membersList) return [];

        let counts: Record<string, number> = {};
        try {
          const stored = localStorage.getItem("lume_mention_counts");
          if (stored) counts = JSON.parse(stored);
        } catch (e) {}

        return [...membersList]
          .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
          .filter(
            item =>
              (item.first_name || "")
                .toLowerCase()
                .startsWith(query.toLowerCase()) ||
              (item.email || "").toLowerCase().startsWith(query.toLowerCase())
          )
          .slice(0, 10);
      },

      render: () => {
        let component: any;
        let popup: any;

        return {
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props: { ...props, noteId, currentTitle },
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },

          onUpdate(props: any) {
            component.updateProps(props);

            if (!props.clientRect) {
              return;
            }

            popup[0].setProps({
              getReferenceClientRect: props.clientRect,
            });
          },

          onKeyDown(props: any) {
            if (props.event.key === "Escape") {
              popup[0].hide();
              return true;
            }
            return component.ref?.onKeyDown(props);
          },

          onExit() {
            if (popup && popup[0]) popup[0].destroy();
            if (component) component.destroy();
          },
        };
      },
    }),
    [organizationMembers, noteId, currentTitle]
  );

  const fileLinkSuggestion = useMemo(
    () => ({
      char: "/",
      items: ({ query }: { query: string }) => {
        if (!notesData) return [];
        return notesData
          .filter(n => n.id !== noteId) // Don't link to self
          .filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10);
      },

      render: () => {
        let component: any;
        let popup: any;

        return {
          onStart: (props: any) => {
            component = new ReactRenderer(FileLinkList, {
              props: { ...props },
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },

          onUpdate(props: any) {
            component.updateProps(props);

            if (!props.clientRect) {
              return;
            }

            popup[0].setProps({
              getReferenceClientRect: props.clientRect,
            });
          },

          onKeyDown(props: any) {
            if (props.event.key === "Escape") {
              popup[0].hide();
              return true;
            }
            return component.ref?.onKeyDown(props);
          },

          onExit() {
            if (popup && popup[0]) popup[0].destroy();
            if (component) component.destroy();
          },
        };
      },
    }),
    [notesData, noteId]
  );

  const editorShortcuts = useMemo(() => {
    return Extension.create({
      name: "editorShortcuts",
      addKeyboardShortcuts() {
        return {
          "Mod-Alt-1": () =>
            this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
          "Mod-Alt-2": () =>
            this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
          "Mod-Alt-3": () =>
            this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
          "Mod-Shift-l": () =>
            this.editor.chain().focus().setTextAlign("left").run(),
          "Mod-Shift-e": () =>
            this.editor.chain().focus().setTextAlign("center").run(),
          "Mod-Shift-r": () =>
            this.editor.chain().focus().setTextAlign("right").run(),
          "Mod-Shift-h": () =>
            this.editor.chain().focus().toggleHighlight().run(),
        };
      },
    });
  }, []);

  // @ts-ignore
  const formatter = useMemo(() => {
    return Extension.create({
      name: "formatter",
      addCommands(): any {
        return {
          // @ts-ignore
          formatDocument:
            () =>
            ({ tr, state, dispatch }: any) => {
              const { doc } = state;
              interface TextChange {
                from: number;
                to: number;
                newText: string;
              }
              const changes: TextChange[] = [];

              doc.descendants((node: any, pos: number) => {
                if (node.isText) {
                  const text = node.text || "";
                  let newText = text.replace(/ +/g, " ");

                  if (text !== newText) {
                    changes.push({ from: pos, to: pos + text.length, newText });
                  }
                }
                return true;
              });

              doc.descendants((node: any, pos: number) => {
                if (node.type.name === "paragraph" && node.content.size > 0) {
                  const firstChild = node.firstChild;
                  const lastChild = node.lastChild;

                  if (firstChild?.isText && firstChild.text?.startsWith(" ")) {
                    const currentText = firstChild.text.trimStart();
                    changes.push({
                      from: pos + 1,
                      to: pos + 1 + firstChild.text.length,
                      newText: currentText,
                    });
                  }

                  if (lastChild?.isText && lastChild.text?.endsWith(" ")) {
                    const currentText = lastChild.text.trimEnd();
                  }
                }
                return true;
              });

              if (dispatch) {
                changes.sort((a, b) => b.from - a.from);

                const uniqueChanges = changes.filter(
                  (c: TextChange, i: number) => {
                    return i === 0 || c.from !== (changes[i - 1]?.from ?? -1);
                  }
                );

                uniqueChanges.forEach(({ from, to, newText }) => {
                  tr.insertText(newText, from, to);
                });

                if (uniqueChanges.length > 0) {
                  toast.success("Document formatted", {
                    description: `Cleaned up ${uniqueChanges.length} text segments.`,
                    duration: 3000,
                  });
                }
              }

              return true;
            },
        };
      },
      addKeyboardShortcuts() {
        return {
          // @ts-ignore
          "Shift-Alt-f": () => this.editor.commands.formatDocument(),
        };
      },
    });
  }, []);

  const self = useSelf();
  const others = useOthers();
  const status = useStatus();
  const [{ title: presenceTitle }, updatePresence] = useMyPresence();

  // Sync title & color TO presence
  useEffect(() => {
    updatePresence({
      title: currentTitle,
      color: self
        ? getUserColor(self.id || self.connectionId.toString())
        : "#155dfb",
    });
  }, [currentTitle, updatePresence, self]);

  const isTitleFocused = useRef(false);

  useEffect(() => {
    const otherWithTitle = others.find((o: any) => {
      const remoteTitle = (o.presence as any)?.title;
      return remoteTitle && remoteTitle !== currentTitle;
    });

    if (otherWithTitle && !isTitleFocused.current) {
      setCurrentTitle((otherWithTitle.presence as any).title);
    }
  }, [others, currentTitle]);

  const extensions = useMemo(
    () => [
      editorShortcuts,
      formatter,
      Collaboration.configure({
        document: doc,
        field: "content",
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name:
            self?.info?.name || self?.connectionId.toString() || "Collaborator",
          color: self
            ? getUserColor(self.id || self.connectionId.toString())
            : "#155dfb",
        },
      }),
      StarterKit.configure({
        heading: false,
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "mention bg-green-500/20 text-green-600 dark:text-green-400 font-semibold rounded-md px-1.5 py-0.5 border border-green-500/30 transition-all hover:bg-green-500/30 cursor-pointer",
        },
        suggestion: mentionSuggestion,
      }),
      FileLink.configure({
        HTMLAttributes: {
          class:
            "file-link bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-md px-1.5 py-0.5 border border-indigo-500/30 transition-all hover:bg-indigo-500/30 cursor-pointer",
        },
        suggestion: fileLinkSuggestion,
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      TaskList,
      TaskItem,
      Link.configure({
        autolink: true,
        openOnClick: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({
        placeholder: "Start writing your note here...",
        emptyEditorClass: "is-editor-empty text-muted-foreground",
      }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Subscript,
      Superscript,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Typography,
      CharacterCount.configure({
        limit: 100000,
      }),
    ],
    [editorShortcuts, formatter, mentionSuggestion, self, provider, doc]
  );

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "tiptap focus:outline-none min-h-[500px] py-6 w-full text-foreground",
      },
    }),
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editorProps,
    onTransaction: ({ editor }) => {
      // We can also use this for specific custom behavior if needed
    },
  });

  // Handle clicks on file links
  useEffect(() => {
    if (!editor || !router) return;

    const handleEditorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const fileLink = target.closest(".file-link") as HTMLElement;
      if (fileLink) {
        const id = fileLink.getAttribute("data-id");
        if (id) {
          router.push(`/notes?note=${id}`);
        }
      }
    };

    const view = editor.view.dom;
    view.addEventListener("click", handleEditorClick);

    return () => {
      view.removeEventListener("click", handleEditorClick);
    };
  }, [editor, router]);

  useEffect(() => {
    if (!editor || readOnly) return;

    const onTransaction = ({ transaction }: { transaction: any }) => {
      // If content isn't fully loaded OR we are in the stabilization phase, ignore
      if (!contentInitialized || !editorReady || isStabilizing.current) {
        return;
      }

      // If it's a remote sync or a known system update, ignore
      const isSync = transaction.getMeta("y-sync-doc") === true;
      const isProgrammatic = transaction.getMeta("is-programmatic") === true;

      if (isSync || isProgrammatic || !transaction.docChanged) {
        return;
      }

      console.log(
        "📝 User-initiated body update detected - setting dirty: true"
      );
      onDirtyChange(true);
    };

    editor.on("transaction", onTransaction);

    // CRITICAL: Global Metadata Synchronization (Save Status & Title)
    const metadataMap = doc.getMap("metadata");
    const yTitle = doc.getText("title");

    const handleYjsSync = () => {
      // 1. Sync Save Timestamp
      const lastSave = metadataMap.get("lastSaveTimestamp");
      if (lastSave) {
        onDirtyChange(false);
      }

      // 2. Sync Title
      const remoteTitle = yTitle.toString();
      if (remoteTitle && remoteTitle !== currentTitle) {
        setCurrentTitle(remoteTitle);
      }
    };

    metadataMap.observe(handleYjsSync);
    yTitle.observe(handleYjsSync);

    return () => {
      editor.off("transaction", onTransaction);
      metadataMap.unobserve(handleYjsSync);
      yTitle.unobserve(handleYjsSync);
    };
  }, [
    editor,
    onDirtyChange,
    readOnly,
    contentInitialized,
    editorReady,
    doc,
    currentTitle,
  ]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!provider) return;

    const handleSynced = (state: boolean) => {
      console.log("Liveblocks Yjs Provider Synced:", state);
      setIsSynced(state);
    };

    provider.on("synced", handleSynced);

    if (provider.synced) {
      setIsSynced(true);
    }

    return () => {
      provider.off("synced", handleSynced);
    };
  }, [provider]);

  useEffect(() => {
    if (note && editor && !contentInitialized && isSynced) {
      setCurrentTitle(note.title);

      const { state, view } = editor;
      const isEditorEmpty = editor.getText().trim() === "";

      const yContent = doc.getXmlFragment("content");
      const isYjsEmpty = yContent.length === 0;

      if (isEditorEmpty && isYjsEmpty && note.content) {
        const sanitizeContent = (node: any): any => {
          if (!node || typeof node !== "object") return node;
          if (node.type === "text" && !node.text) return null;
          if (node.content && Array.isArray(node.content)) {
            return {
              ...node,
              content: node.content.map(sanitizeContent).filter(Boolean),
            };
          }
          return node;
        };

        let docNode = null;
        try {
          if (
            note.content &&
            typeof note.content === "object" &&
            (note.content as any).type === "doc"
          ) {
            docNode = state.schema.nodeFromJSON(sanitizeContent(note.content));
          } else if (
            typeof note.content === "string" &&
            !note.content.includes('"root":{')
          ) {
            editor.commands.setContent(note.content, false);
          } else if (note.content) {
            try {
              const parsed =
                typeof note.content === "string"
                  ? JSON.parse(note.content)
                  : note.content;
              if (parsed.type === "doc") {
                docNode = state.schema.nodeFromJSON(sanitizeContent(parsed));
              }
            } catch (e) {}
          }
        } catch (e) {
          console.error("Collision/Parse error during initialization:", e);
        }

        if (docNode) {
          const tr = state.tr.replaceWith(0, state.doc.content.size, docNode);
          tr.setMeta("addToHistory", false);
          tr.setMeta("y-sync-doc", true);
          tr.setMeta("is-programmatic", true); // MARK AS PROGRAMMATIC
          view.dispatch(tr);
        }
      } else if (!isYjsEmpty) {
        console.log(
          "Cloud room already has content. Skipping DB backup to prevent duplication."
        );
      }

      setContentInitialized(true);
      setEditorReady(true);
    }
  }, [note, editor, contentInitialized, doc, isSynced]);

  // Reset dirty state when a new note is loaded
  useEffect(() => {
    onDirtyChange(false);
  }, [noteId, onDirtyChange]);

  const queryClient = useQueryClient();
  const saveToAPI = useCallback(
    async (data: { title?: string; content?: any }) => {
      if (!editor || saving) return;

      const titleToSave = data.title || currentTitle;
      const contentToSave = data.content || editor.getJSON();

      setSaving(true);
      const toastId = toast.loading("Saving changes...");

      try {
        await updateNoteMutation.mutateAsync({
          id: noteId,
          data: { title: titleToSave, content: contentToSave },
        });

        // Invalidate history query so it refreshes instantly
        queryClient.invalidateQueries({ queryKey: ["note-history", noteId] });

        // CRITICAL: Global Save Signal - notify ALL collaborators
        doc.getMap("metadata").set("lastSaveTimestamp", Date.now());

        toast.success("Note saved manually!", { id: toastId });
        onDirtyChange(false);
      } catch (err) {
        console.error("Save error:", err);
        toast.error("Failed to save changes. Please try again.", {
          id: toastId,
        });
      } finally {
        setSaving(false);
      }
    },
    [
      editor,
      noteId,
      currentTitle,
      updateNoteMutation,
      onDirtyChange,
      saving,
      queryClient,
    ]
  );

  useEffect(() => {
    if (typeof registerSaveFn === "function") {
      registerSaveFn(() => saveToAPI({ title: currentTitle }));
    }
  }, [registerSaveFn, saveToAPI, currentTitle]);

  const onTitleChange = (newTitle: string) => {
    // 1. Guard for initialization/read-only
    if (readOnly || isStabilizing.current || !contentInitialized) {
      if (!readOnly && isStabilizing.current) {
        setCurrentTitle(newTitle);
      }
      return;
    }

    if (newTitle !== currentTitle) {
      // Update local state and Yjs doc
      setCurrentTitle(newTitle);
      const yTitle = doc.getText("title");

      doc.transact(() => {
        const currentYLength = yTitle.length;
        if (currentYLength > 0) yTitle.delete(0, currentYLength);
        yTitle.insert(0, newTitle);
      }, "is-local-title-change");

      onDirtyChange(true);
    }
  };

  const handleManualSave = async () => {
    await saveToAPI({ title: currentTitle });
  };

  const handleAddTag = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (readOnly) return;
    const tag = newTag.trim();
    if (!tag) return;
    if (note?.tags?.includes(tag)) {
      setNewTag("");
      return;
    }

    const updatedTags = [...(note?.tags || []), tag];
    setNewTag("");

    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        data: { tags: updatedTags },
      });
      onNoteUpdate(noteId, { tags: updatedTags });
      toast.success(`Tag "${tag}" added`);
    } catch (err) {
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (readOnly) return;
    const updatedTags = (note?.tags || []).filter(
      (t: string) => t !== tagToRemove
    );
    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        data: { tags: updatedTags },
      });
      onNoteUpdate(noteId, { tags: updatedTags });
      toast.success("Tag removed");
    } catch (err) {
      toast.error("Failed to remove tag");
    }
  };

  const handleUpdateFolder = async (folderName: string | null) => {
    if (readOnly) return;
    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        data: { folder: folderName },
      });
      onNoteUpdate(noteId, { folder: folderName });
      toast.success(folderName ? `Moved to "${folderName}"` : "Moved to Main");
    } catch (err) {
      toast.error("Failed to move note");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const code = e.code;

      if (isMod && code === "KeyS") {
        e.preventDefault();
        if (isDirty && !saving && !readOnly) {
          handleManualSave();
        }
      } else if (isMod && code === "Backslash") {
        e.preventDefault();
        if (!readOnly) {
          const newState = !isLeftSidebarOpen;
          onLeftSidebarOpenChange(newState);
          if (newState && window.innerWidth < 768 && onToggleAppSidebar) {
            // No direct way to close app sidebar if it's already open and we only have onToggle
            // But we can assume if we're opening this, we want the other closed.
            // Our parent handles the logic.
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, handleManualSave, readOnly, onLeftSidebarOpenChange]);

  if (isLoading || !editorReady) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="flex-1 space-y-4 px-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }
  if (error)
    return <p className="text-destructive p-4 text-sm">Failed to load note.</p>;
  if (!note) return null;

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        editor={editor}
        noteId={noteId}
        tags={note.tags}
        onSave={handleManualSave}
        disabled={saving || readOnly}
        isDirty={isDirty}
        saving={saving}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => {
          const newState = !isLeftSidebarOpen;
          onLeftSidebarOpenChange(newState);
          if (newState && window.innerWidth < 768 && onToggleAppSidebar) {
            // Parent will handle closing app sidebar
          }
        }}
        onInviteUser={onInviteUser}
        onExportNote={onExportNote ? () => onExportNote(note) : undefined}
        onShareNote={onShareNote ? () => onShareNote(note) : undefined}
        activeUsers={others as any}
        readOnly={readOnly}
        canShare={isAdmin || (tenant?.members_can_share ?? true)}
        canRestore={isAdmin || (tenant?.members_can_edit ?? true)}
        currentContent={editor?.getJSON()}
        onShowGraph={onShowGraph}
        onToggleAppSidebar={onToggleAppSidebar}
      />
      <div className="flex flex-1 overflow-hidden">
        <NoteEditorSidebar
          note={note}
          isLeftSidebarOpen={isLeftSidebarOpen}
          setIsLeftSidebarOpen={onLeftSidebarOpenChange}
          newTag={newTag}
          setNewTag={setNewTag}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          onPDFUpload={onPDFUpload}
          readOnly={readOnly}
          folders={foldersData || []}
          handleUpdateFolder={handleUpdateFolder}
          onSelectNote={id => router.push(`/notes?note=${id}`)}
        />
        <div className="custom-scrollbar h-[calc(100vh-120px)] flex-1 overflow-x-hidden overflow-y-auto scroll-smooth md:h-[calc(100vh-60px)]">
          {readOnly && (
            <div className="mx-auto mt-4 w-full max-w-4xl px-4 md:px-6">
              <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-600 duration-300 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  Viewing in read-only mode. Editing is restricted by your
                  administrator.
                </p>
              </div>
            </div>
          )}
          <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-24 md:px-8">
            <input
              className={cn(
                "text-foreground m-0 mb-4 w-full border-none bg-transparent p-0 text-4xl font-extrabold tracking-tight transition-none focus:ring-0 focus:outline-none focus-visible:ring-0",
                readOnly &&
                  "pointer-events-none cursor-default opacity-80 select-none"
              )}
              value={currentTitle}
              onChange={e => onTitleChange(e.target.value)}
              onFocus={() => {
                isTitleFocused.current = true;
              }}
              onBlur={() => {
                isTitleFocused.current = false;
              }}
              placeholder="Untitled"
              disabled={readOnly}
            />
            <NoteEditor editor={editor} readOnly={readOnly} />
          </div>
        </div>
      </div>
    </div>
  );
});

const MentionList = React.forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({
        id: item.id,
        label: item.first_name || item.email.split("@")[0],
      });

      try {
        const stored = localStorage.getItem("lume_mention_counts");
        const counts = stored ? JSON.parse(stored) : {};
        counts[item.id] = (counts[item.id] || 0) + 1;
        localStorage.setItem("lume_mention_counts", JSON.stringify(counts));
      } catch (e) {}

      toast.success(
        `Mentioned ${item.first_name || item.email.split("@")[0]}`,
        {
          icon: (
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          ),
        }
      );
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (selectedIndex + props.items.length - 1) % props.items.length
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-popover border-border/50 animate-in fade-in zoom-in-95 z-99999 flex min-w-[220px] flex-col overflow-hidden rounded-lg border p-1 text-white shadow-xl duration-200">
      {/* Search Header / Title */}
      <div className="border-border/30 mb-1 border-b px-3 py-2 text-[12px] font-semibold tracking-widest text-white/60">
        Team Members
      </div>

      {props.items.length ? (
        <div className="custom-scrollbar max-h-[300px] overflow-y-auto">
          {props.items.map((item: any, index: number) => (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              className={cn(
                "group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-all duration-200 outline-none select-none",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Avatar / Circle Icon */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300",
                  index === selectedIndex
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                    : "bg-muted border-border group-hover:bg-background"
                )}
              >
                {(item.first_name?.[0] || item.email?.[0] || "?").toUpperCase()}
              </div>

              {/* Name & Email Info */}
              <div className="flex min-w-0 flex-col text-left">
                <span
                  className={cn(
                    "truncate leading-none font-medium",
                    index === selectedIndex
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {item.first_name
                    ? `${item.first_name} ${item.last_name || ""}`
                    : item.email.split("@")[0]}
                </span>
                <span className="text-muted-foreground mt-0.5 truncate text-[10px] opacity-70">
                  {item.email}
                </span>
              </div>

              {/* Selection Indicator Dot */}
              {index === selectedIndex && (
                <div className="ml-auto flex items-center">
                  <div className="bg-primary size-1.5 animate-pulse rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-2 px-4 py-8 text-xs italic">
          <User className="mb-1 h-5 w-5 opacity-20" />
          <span>No members found</span>
        </div>
      )}
    </div>
  );
});
MentionList.displayName = "MentionList";

const FileLinkList = React.forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({
        id: item.id,
        label: item.title || "Untitled",
      });

      toast.success(`Linked to "${item.title || "Untitled"}"`, {
        icon: (
          <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        ),
      });
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (selectedIndex + props.items.length - 1) % props.items.length
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-popover border-border/50 animate-in fade-in zoom-in-95 z-99999 flex min-w-[220px] flex-col overflow-hidden rounded-lg border p-1 text-white shadow-xl duration-200">
      <div className="border-border/30 mb-1 border-b px-3 py-2 text-[12px] font-semibold tracking-widest text-white/60">
        Insert Note Link
      </div>

      {props.items.length ? (
        <div className="custom-scrollbar max-h-[300px] overflow-y-auto">
          {props.items.map((item: any, index: number) => (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              className={cn(
                "group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-all duration-200 outline-none select-none",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300",
                  index === selectedIndex
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                    : "bg-muted border-border group-hover:bg-background"
                )}
              >
                <File className="h-4 w-4" />
              </div>

              <div className="flex min-w-0 flex-col text-left">
                <span
                  className={cn(
                    "truncate leading-none font-medium",
                    index === selectedIndex
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {item.title || "Untitled"}
                </span>
                <span className="text-muted-foreground mt-0.5 truncate text-[10px] opacity-70">
                  {new Date(item.updated_at).toLocaleDateString()}
                </span>
              </div>

              {index === selectedIndex && (
                <div className="ml-auto flex items-center">
                  <div className="bg-primary size-1.5 animate-pulse rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-2 px-4 py-8 text-xs italic">
          <File className="mb-1 h-5 w-5 opacity-20" />
          <span>No notes found</span>
        </div>
      )}
    </div>
  );
});
FileLinkList.displayName = "FileLinkList";
