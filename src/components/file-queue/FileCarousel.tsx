import React, { useRef, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FileItem } from '../../types/fileItem';
import { FileCard } from './FileCard';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface FileCarouselProps {
  files: FileItem[];
  supportsReorder: boolean;
  onFilesReordered: (files: FileItem[]) => void;
  onRemoveFile: (id: string) => void;
  onDownloadIndividual?: (id: string) => void;
}

export const FileCarousel: React.FC<FileCarouselProps> = ({
  files,
  supportsReorder,
  onFilesReordered,
  onRemoveFile,
  onDownloadIndividual,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [files]);

  const handleScroll = (amount: number) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: amount,
      behavior: 'smooth',
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.id === active.id);
      const newIndex = files.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onFilesReordered(arrayMove(files, oldIndex, newIndex));
      }
    }
  };

  const handleMoveEarlier = (idx: number) => {
    if (idx > 0) {
      onFilesReordered(arrayMove(files, idx, idx - 1));
    }
  };

  const handleMoveLater = (idx: number) => {
    if (idx < files.length - 1) {
      onFilesReordered(arrayMove(files, idx, idx + 1));
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border border-slate-200/80 text-center my-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Inbox className="w-6 h-6 stroke-[1.5]" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No files in queue</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload or drag files above to populate the queue
        </p>
      </div>
    );
  }

  return (
    <div className="relative my-4 group">
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={() => handleScroll(-280)}
        disabled={!canScrollLeft}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 transition-opacity ${
          canScrollLeft
            ? 'opacity-90 hover:opacity-100 hover:text-brand-600 cursor-pointer'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Horizontally Scrollable DND Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          className="flex space-x-3 overflow-x-auto py-3 px-1 scrollbar-thin scrollbar-thumb-slate-200"
        >
          <SortableContext
            items={files.map((f) => f.id)}
            strategy={horizontalListSortingStrategy}
          >
            <ul className="flex space-x-3" role="list">
              {files.map((file, idx) => (
                <FileCard
                  key={file.id}
                  item={file}
                  supportsReorder={supportsReorder}
                  onRemove={onRemoveFile}
                  onDownloadIndividual={onDownloadIndividual}
                  index={idx}
                  totalCount={files.length}
                  onMoveEarlier={handleMoveEarlier}
                  onMoveLater={handleMoveLater}
                />
              ))}
            </ul>
          </SortableContext>
        </div>
      </DndContext>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={() => handleScroll(280)}
        disabled={!canScrollRight}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 transition-opacity ${
          canScrollRight
            ? 'opacity-90 hover:opacity-100 hover:text-brand-600 cursor-pointer'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
