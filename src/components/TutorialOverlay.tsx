import { useEffect, useState, useCallback, useRef } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTutorialStore,
  getStepContent,
  getStepPage,
  TUTORIAL_STEPS,
  type TutorialStep,
  type TutorialPage,
} from "../stores/tutorialStore";
import { playClick } from "../stores/audioStore";

const MotionBox = motion(Box);

// =============================================================================
// Tutorial trigger button — place in top bar to start tutorial manually
// =============================================================================

export function TutorialButton() {
  const { reset, active } = useTutorialStore();
  const navigate = useNavigate();

  const handleClick = () => {
    playClick();
    reset();
    setTimeout(() => {
      useTutorialStore.getState().start();
      navigate("/tutorial");
    }, 50);
  };

  if (active) return null;

  return (
    <Box
      as="button"
      onClick={handleClick}
      position="relative"
      h="40px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      px={3}
      bg="rgba(18,30,18,0.85)"
      border="1px solid"
      borderColor="surface.border"
      borderRadius="10px"
      color="text.secondary"
      cursor="pointer"
      _hover={{ borderColor: "green.400", color: "green.300" }}
      transition="all 0.2s"
      title="Start Tutorial"
      mr={2}
    >
      <Text fontSize="14px" lineHeight="1">&#9654;</Text>
      <Text
        fontSize="11px"
        fontFamily="mono"
        fontWeight="600"
        letterSpacing="0.06em"
        textTransform="uppercase"
      >
        Tutorial
      </Text>
    </Box>
  );
}

// =============================================================================
// Spotlight geometry — finds the target element and returns its rect
// =============================================================================

function useTargetRect(target: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  const measure = useCallback(() => {
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
    rafRef.current = requestAnimationFrame(measure);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [measure, target]);

  return rect;
}

// =============================================================================
// Tooltip position calculator
// =============================================================================

function getTooltipStyle(
  rect: DOMRect,
  position: "top" | "bottom" | "left" | "right"
): React.CSSProperties {
  const gap = 14;
  const base: React.CSSProperties = { position: "fixed", zIndex: 10002 };

  switch (position) {
    case "top":
      return {
        ...base,
        left: rect.left + rect.width / 2,
        top: rect.top - gap,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        ...base,
        left: rect.left + rect.width / 2,
        top: rect.bottom + gap,
        transform: "translate(-50%, 0)",
      };
    case "left":
      return {
        ...base,
        left: rect.left - gap,
        top: rect.top + rect.height / 2,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        ...base,
        left: rect.right + gap,
        top: rect.top + rect.height / 2,
        transform: "translate(0, -50%)",
      };
  }
}

// =============================================================================
// Arrow component pointing toward the target
// =============================================================================

function TooltipArrow({ position }: { position: "top" | "bottom" | "left" | "right" }) {
  const size = 8;
  const color = "rgba(21, 34, 28, 0.96)";

  const styles: Record<string, React.CSSProperties> = {
    top: {
      position: "absolute",
      bottom: -size,
      left: "50%",
      transform: "translateX(-50%)",
      width: 0,
      height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderTop: `${size}px solid ${color}`,
    },
    bottom: {
      position: "absolute",
      top: -size,
      left: "50%",
      transform: "translateX(-50%)",
      width: 0,
      height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid ${color}`,
    },
    left: {
      position: "absolute",
      right: -size,
      top: "50%",
      transform: "translateY(-50%)",
      width: 0,
      height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderLeft: `${size}px solid ${color}`,
    },
    right: {
      position: "absolute",
      left: -size,
      top: "50%",
      transform: "translateY(-50%)",
      width: 0,
      height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderRight: `${size}px solid ${color}`,
    },
  };

  return <div style={styles[position]} />;
}

// =============================================================================
// Main overlay component
// =============================================================================

interface TutorialOverlayProps {
  page: TutorialPage;
}

export function TutorialOverlay({ page }: TutorialOverlayProps) {
  const { currentStep, active, advance, goBack } = useTutorialStore();

  if (!active || !currentStep) return null;
  if (getStepPage(currentStep) !== page) return null;

  const stepIdx = TUTORIAL_STEPS.indexOf(currentStep);
  const isFirst = stepIdx === 0;

  return <TutorialStepView step={currentStep} onNext={advance} onBack={goBack} isFirst={isFirst} />;
}

function TutorialStepView({ step, onNext, onBack, isFirst }: { step: TutorialStep; onNext: () => void; onBack: () => void; isFirst: boolean }) {
  const content = getStepContent(step);
  const isCentered = content.target === null;
  const rect = useTargetRect(content.target);

  // Keyboard arrow navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && !content.interactive) { playClick(); onNext(); }
      else if (e.key === "ArrowLeft" && !isFirst) { playClick(); onBack(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, onBack, isFirst, content.interactive]);

  // For targeted steps, wait until target element is found
  if (!isCentered && !rect) return null;

  const pad = 8;

  return (
    <AnimatePresence>
      <MotionBox
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        position="fixed"
        inset={0}
        zIndex={10000}
        pointerEvents="none"
      >
        {/* Dark overlay */}
        {isCentered ? (
          /* Centered: uniform dark overlay, no cutout */
          content.noOverlay ? null : (
          <Box
            position="fixed"
            inset={0}
            bg="rgba(4, 8, 6, 0.6)"
            pointerEvents="none"
            zIndex={10000}
          />
          )
        ) : rect && (
          /* Targeted: dark overlay with cutout */
          <>
            <Box
              as="svg"
              position="fixed"
              inset={0}
              w="100vw"
              h="100vh"
              pointerEvents="none"
              zIndex={10000}
            >
              <defs>
                <mask id="tutorial-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={rect.left - pad}
                    y={rect.top - pad}
                    width={rect.width + pad * 2}
                    height={rect.height + pad * 2}
                    rx="12"
                    ry="12"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(4, 8, 6, 0.72)"
                mask="url(#tutorial-mask)"
              />
            </Box>

            {/* Spotlight border glow */}
            <Box
              position="fixed"
              left={`${rect.left - pad}px`}
              top={`${rect.top - pad}px`}
              w={`${rect.width + pad * 2}px`}
              h={`${rect.height + pad * 2}px`}
              borderRadius="12px"
              border="2px solid"
              borderColor="rgba(135, 180, 155, 0.5)"
              boxShadow="0 0 24px rgba(135, 180, 155, 0.18), inset 0 0 24px rgba(135, 180, 155, 0.06)"
              pointerEvents="none"
              zIndex={10001}
            />
          </>
        )}

        {/* Tooltip */}
        <Box
          style={
            isCentered
              ? { position: "fixed", zIndex: 10002, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
              : getTooltipStyle(rect!, content.position)
          }
          pointerEvents="auto"
        >
          <MotionBox
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            bg="rgba(21, 34, 28, 0.96)"
            border="1px solid"
            borderColor="rgba(135, 180, 155, 0.4)"
            borderRadius="12px"
            px={4}
            py={3}
            maxW="300px"
            minW="220px"
            backdropFilter="blur(12px)"
            boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
            position="relative"
          >
            {!isCentered && <TooltipArrow position={content.position} />}

            <Text
              fontSize="14px"
              fontWeight="700"
              color="#E5DED0"
              fontFamily="heading"
              letterSpacing="0.03em"
              lineHeight="1.3"
              mb={content.subtext ? 1 : 0}
            >
              {content.text}
            </Text>

            {content.subtext && (
              <Text
                fontSize="12px"
                color="#9AA99B"
                lineHeight="1.5"
              >
                {content.subtext}
              </Text>
            )}

            {/* Step indicator dots + nav arrows */}
            <Flex align="center" justify="space-between" mt={3}>
              <Box
                as="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!isFirst) { playClick(); onBack(); }
                }}
                fontSize="16px"
                color={isFirst ? "rgba(135, 180, 155, 0.2)" : "#A7D5BF"}
                cursor={isFirst ? "default" : "pointer"}
                _hover={isFirst ? {} : { color: "#D0F0E0" }}
                transition="color 0.2s"
                px={1}
                userSelect="none"
              >
                &#9664;
              </Box>

              <Flex gap="4px">
                {TUTORIAL_STEPS.map((s) => (
                  <Box
                    key={s}
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg={s === step ? "#A7D5BF" : "rgba(135, 180, 155, 0.2)"}
                    transition="all 0.3s"
                    boxShadow={s === step ? "0 0 6px rgba(167, 213, 191, 0.5)" : "none"}
                  />
                ))}
              </Flex>

              {content.interactive ? (
                /* No forward arrow on interactive steps */
                <Box px={1} w="24px" />
              ) : (
                <Box
                  as="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    playClick();
                    onNext();
                  }}
                  fontSize="16px"
                  color="#A7D5BF"
                  cursor="pointer"
                  _hover={{ color: "#D0F0E0" }}
                  transition="color 0.2s"
                  px={1}
                  userSelect="none"
                >
                  &#9654;
                </Box>
              )}
            </Flex>
          </MotionBox>
        </Box>
      </MotionBox>
    </AnimatePresence>
  );
}
