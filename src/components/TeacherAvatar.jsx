const SIZES = {
  xs: 'h-10 w-10',
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-36 w-36 sm:h-44 sm:w-44',
  xl: 'h-52 w-52 sm:h-64 sm:w-64',
}

// Animated teacher portrait: gentle float on the wrapper, breathing scale on
// the image, and a soft ambient glow in the teacher's accent color.
export default function TeacherAvatar({
  teacher,
  size = 'md',
  animated = true,
  delay = '0s',
  ring = true,
  className = '',
}) {
  return (
    <div
      className={`${animated ? 'avatar-float avatar-glow' : ''} ${className}`}
      style={{ '--avatar-glow': teacher.glow, animationDelay: delay }}
    >
      <img
        src={teacher.avatar}
        alt={`${teacher.name}, ${teacher.field} teacher`}
        loading="lazy"
        draggable="false"
        className={`${animated ? 'avatar-breathe' : ''} rounded-full object-cover ${SIZES[size] ?? SIZES.md}`}
        style={
          ring
            ? { boxShadow: `0 0 0 3px ${teacher.accent}, 0 0 30px ${teacher.glow}` }
            : undefined
        }
      />
    </div>
  )
}
