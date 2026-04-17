/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders trigger and opens content on click", async () => {
    render(
      <Dialog>
        <DialogTrigger>Открыть диалог</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заголовок теста</DialogTitle>
            <DialogDescription>Описание теста</DialogDescription>
          </DialogHeader>
          <div>Контент диалога</div>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByText(/открыть диалог/i);
    expect(trigger).toBeInTheDocument();

    // Content should not be in the document yet (or hidden)
    expect(screen.queryByText(/заголовок теста/i)).not.toBeInTheDocument();

    fireEvent.click(trigger);

    // After click, content should appear
    expect(await screen.findByText(/заголовок теста/i)).toBeInTheDocument();
    expect(screen.getByText(/контент диалога/i)).toBeInTheDocument();
  });

  it("closes when close button is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Открыть для закрытия</DialogTrigger>
        <DialogContent>
          <div>Контент</div>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByText(/открыть для закрытия/i));
    
    // Check if content appeared
    expect(await screen.findByText(/контент/i)).toBeInTheDocument();

    // The close button has sr-only text "Close". 
    // Sometimes getByRole name fails in JSDOM if aria metrics are not perfectly calculated.
    const closeButton = await screen.findByText(/close/i);
    expect(closeButton.closest("button")).toBeInTheDocument();

    fireEvent.click(closeButton.closest("button")!);

    // Dialog should close. We can check for absence or aria-hidden
    // Base UI might unmount it.
    await vi.waitFor(() => {
      expect(screen.queryByText(/контент/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
